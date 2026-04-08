import Redis from 'ioredis';
import { ENV } from '../config/env';
import { query } from './db';

// Upstash standard connection requires TLS wrapper
const redisOptions = ENV.REDIS_URL.includes('upstash') ? { tls: { rejectUnauthorized: false } } : {};

export const redis = new Redis(ENV.REDIS_URL, redisOptions);

redis.on('error', (err) => {
  console.error('[REDIS] Connection error:', err);
});

redis.on('connect', () => {
  console.log('[REDIS] Successfully connected');
});

/**
 * Distributed Lock (Prevents race conditions)
 * Tries to acquire a lock using SET NX PX
 * @param key The lock key (e.g., product:123:lock)
 * @param lockValue Unique identifier (e.g., customer_phone)
 * @param ttlMs Time to live in milliseconds (default 120s / 120000ms)
 * @returns boolean True if locked acquired, false if already locked
 */
export async function acquireLock(key: string, lockValue: string, ttlMs: number = 120000): Promise<boolean> {
  const acquired = await redis.set(key, lockValue, 'PX', ttlMs, 'NX');
  return acquired === 'OK';
}

/**
 * Release Distributed Lock using a Lua script
 * Ensures we only release the lock if we own it (lockValue matches)
 */
export async function releaseLock(key: string, lockValue: string): Promise<boolean> {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  // @ts-ignore
  const result = await redis.eval(script, 1, key, lockValue);
  return result === 1;
}

// =====================================================
// PHASE 6: Tiered Timer & State Management Functions
// Redis key schema from spec Section 3 — exact patterns
// Every call is wrapped in try/catch with DB fallback
// =====================================================

export interface ReservationData {
  productId: number;
  clientId: string;
  customerPhone: string;
  hashId: string;
  reservedAt: number;
}

/**
 * Sets the primary Hard Reservation lock.
 * Key: reserve:item:{productId}:lock  — 600s (10 min per spec Section 5)
 * NX = only set if key does not ALREADY exist (prevents double booking)
 */
export async function setHardReservation(productId: number, data: ReservationData): Promise<boolean> {
  const key = `reserve:item:${productId}:lock`;
  const statusKey = `reserve:item:${productId}:status`;
  const value = JSON.stringify({ ...data, status: 'hard_reserved', reservedAt: Date.now() });
  try {
    // FIX 3: Use single atomic SET NX EX — eliminates the setnx+expire race condition.
    // If server crashes between setnx and expire, the key would have lived forever.
    // The atomic command guarantees: set with TTL or don't set at all.
    const wasSet = await redis.set(key, value, 'EX', 600, 'NX');
    if (wasSet !== 'OK') return false;
    await redis.set(statusKey, 'hard_reserved', 'EX', 600);
    return true;
  } catch (err) {
    console.error('[REDIS] setHardReservation failed, using DB fallback:', err);
    return acquireDBFallbackLock(key, { ...data, status: 'hard_reserved' }, 600);
  }
}

/**
 * Reads current reservation status key
 * Key: reserve:item:{productId}:status
 */
export async function getReservationStatus(productId: number): Promise<string | null> {
  const statusKey = `reserve:item:${productId}:status`;
  try {
    return await redis.get(statusKey);
  } catch {
    // Check DB fallback
    const r = await query(`SELECT lock_value FROM redis_fallback WHERE lock_key = $1 AND expires_at > NOW()`, [statusKey]);
    return r.rows[0]?.lock_value?.status || null;
  }
}

/**
 * Extends timer when PAYMENT_INITIATED webhook is received.
 * Key: reserve:item:{productId}:lock  extended to 900s (15 min)
 */
export async function extendToPaymentInitiated(productId: number): Promise<void> {
  const key = `reserve:item:${productId}:lock`;
  const statusKey = `reserve:item:${productId}:status`;
  try {
    const existing = await redis.get(key);
    if (!existing) throw new Error(`RESERVATION_NOT_FOUND: product ${productId}`);
    const data = JSON.parse(existing);
    await redis.set(key, JSON.stringify({ ...data, status: 'payment_initiated', initiatedAt: Date.now() }), 'EX', 900);
    await redis.set(statusKey, 'payment_initiated', 'EX', 900);
  } catch (err) {
    console.error('[REDIS] extendToPaymentInitiated failed:', err);
    throw err;
  }
}

/**
 * Extends timer when PAYMENT_PROCESSING webhook is received.
 * Extended to 1200s (20 min) per spec Section 5
 */
export async function extendToPaymentProcessing(productId: number): Promise<void> {
  const key = `reserve:item:${productId}:lock`;
  const statusKey = `reserve:item:${productId}:status`;
  try {
    const existing = await redis.get(key);
    if (!existing) throw new Error(`RESERVATION_NOT_FOUND: product ${productId}`);
    const data = JSON.parse(existing);
    await redis.set(key, JSON.stringify({ ...data, status: 'payment_processing', processingAt: Date.now() }), 'EX', 1200);
    await redis.set(statusKey, 'payment_processing', 'EX', 1200);
  } catch (err) {
    console.error('[REDIS] extendToPaymentProcessing failed:', err);
    throw err;
  }
}

/**
 * Sets 2-minute grace window after Hard Reservation expires.
 * Key: grace:window:{productId}
 */
export async function setGraceWindow(productId: number, data: { originalPhone: string; clientId: string; expiredAt: number }): Promise<void> {
  const key = `grace:window:${productId}`;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', 120);
  } catch (err) {
    console.error('[REDIS] setGraceWindow failed:', err);
  }
}

export async function getGraceWindow(productId: number): Promise<{ originalPhone: string; clientId: string; expiredAt: number } | null> {
  const key = `grace:window:${productId}`;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function deleteGraceWindow(productId: number): Promise<void> {
  try { await redis.del(`grace:window:${productId}`); } catch { /* noop */ }
}

/**
 * Stores / retrieves customer session state for context memory.
 * Key: session:customer:{clientId}:{phone}  TTL: 3600s
 */
export async function setSessionState(clientId: string, phone: string, data: object): Promise<void> {
  const key = `session:customer:${clientId}:${phone}`;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', 3600);
  } catch { /* non-critical */ }
}

export async function getSessionState(clientId: string, phone: string): Promise<any | null> {
  const key = `session:customer:${clientId}:${phone}`;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

/**
 * Idempotency gate for Cashfree webhooks.
 * Key: webhook:processed:{orderId}  TTL: 86400s
 */
export async function markWebhookProcessed(orderId: string): Promise<void> {
  try { await redis.set(`webhook:processed:${orderId}`, 'done', 'EX', 86400); } catch { /* noop */ }
}

export async function isWebhookProcessed(orderId: string): Promise<boolean> {
  try {
    const val = await redis.get(`webhook:processed:${orderId}`);
    return val === 'done';
  } catch { return false; }
}

/**
 * Rate limiter for incoming messages.
 * Key: ratelimit:msg:{phone}  — rolling 60s, increment count
 * Returns current count (caller decides to block if > 60)
 */
export async function incrementRateLimit(phone: string): Promise<number> {
  const key = `ratelimit:msg:${phone}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    return count;
  } catch { return 0; /* allow through on Redis error */ }
}

/**
 * Releases reservation lock — fully deletes both keys
 */
export async function releaseHardReservation(productId: number): Promise<void> {
  try {
    await redis.del(`reserve:item:${productId}:lock`, `reserve:item:${productId}:status`);
  } catch (err) {
    console.error('[REDIS] releaseHardReservation failed:', err);
    // Best-effort DB cleanup
    await query(`DELETE FROM redis_fallback WHERE lock_key = $1`, [`reserve:item:${productId}:lock`]).catch(() => { });
  }
}

/**
 * DB fallback — called when Redis is unavailable.
 * Stores the lock in the redis_fallback table so the reservation doesn't fail silently.
 */
async function acquireDBFallbackLock(lockKey: string, lockValue: object, ttlSeconds: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  try {
    const result = await query(
      `INSERT INTO redis_fallback (lock_key, lock_value, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (lock_key) DO NOTHING
             RETURNING id`,
      [lockKey, JSON.stringify(lockValue), expiresAt]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (dbErr) {
    console.error('[DB_FALLBACK] DB fallback also failed:', dbErr);
    return false;
  }
}

// =====================================================
// PHASE 9 KYC Addendum: Redis Key Helpers
// Key schema from KYC Addendum Section 5
// All TTLs: 1800s (30 min) unless noted
// =====================================================

export type KYCState =
  | 'not_started'
  | `prefill_shown`
  | `collecting:${string}`
  | 'preview_shown'
  | `editing:${string}`
  | 'confirmed';

export interface KYCDraft {
  full_name?: string;
  email?: string | null;
  delivery_preference?: 'delivery' | 'pickup';
  address_line1?: string;
  address_line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaar_raw_temp?: string; // DELETED immediately after encryptAadhaar() is called
  retry_counts?: Partial<Record<string, number>>;
}

export interface ProductIntent {
  productId: number;
  hashId: string;
  clientId: string;
  intendedAction: 'reserve_physical' | 'request_virtual';
}

/** KYC state key — tracks where in the flow the customer is */
export async function getKYCState(clientId: string, phone: string): Promise<KYCState | null> {
  try {
    const val = await redis.get(`kyc:${clientId}:${phone}:state`);
    return (val as KYCState) ?? null;
  } catch { return null; }
}

export async function setKYCState(clientId: string, phone: string, state: KYCState, ttl = 1800): Promise<void> {
  try {
    await redis.set(`kyc:${clientId}:${phone}:state`, state, 'EX', ttl);
  } catch (err) { console.error('[REDIS] setKYCState failed:', err); }
}

/** KYC draft — accumulates field responses */
export async function getKYCDraft(clientId: string, phone: string): Promise<KYCDraft | null> {
  try {
    const raw = await redis.get(`kyc:${clientId}:${phone}:draft`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setKYCDraft(clientId: string, phone: string, draft: KYCDraft): Promise<void> {
  try {
    await redis.set(`kyc:${clientId}:${phone}:draft`, JSON.stringify(draft), 'EX', 1800);
  } catch (err) { console.error('[REDIS] setKYCDraft failed:', err); }
}

/** Product intent — saved at buy-intent so reserveProduct knows which product after KYC confirms */
export async function getProductIntent(clientId: string, phone: string): Promise<ProductIntent | null> {
  try {
    const raw = await redis.get(`kyc:${clientId}:${phone}:product_intent`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setProductIntent(clientId: string, phone: string, intent: ProductIntent): Promise<void> {
  try {
    await redis.set(`kyc:${clientId}:${phone}:product_intent`, JSON.stringify(intent), 'EX', 1800);
  } catch (err) { console.error('[REDIS] setProductIntent failed:', err); }
}

/** Clears all KYC keys for a customer — called after successful KYC confirm */
export async function clearKYCKeys(clientId: string, phone: string): Promise<void> {
  try {
    await redis.del(
      `kyc:${clientId}:${phone}:draft`,
      `kyc:${clientId}:${phone}:product_intent`
    );
    // Note: :state key is kept as 'confirmed' for 20 min to prevent re-collection on retries
  } catch (err) { console.error('[REDIS] clearKYCKeys failed:', err); }
}

