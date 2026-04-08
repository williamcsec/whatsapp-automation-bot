/**
 * Layer 3: Redis + DB Integration Tests
 * Uses live Upstash Redis + live Supabase DB.
 * All Redis keys use a test-specific prefix and are deleted after each test.
 */
import { redis } from '../services/redis';
import {
    setHardReservation,
    extendToPaymentInitiated,
    setGraceWindow,
    getGraceWindow,
    deleteGraceWindow,
    isWebhookProcessed,
    markWebhookProcessed,
    releaseHardReservation,
    incrementRateLimit,
    getSessionState,
    setSessionState,
    ReservationData,
} from '../services/redis';

// Use test-specific product IDs that won't conflict with real data
const TEST_PRODUCT_ID = 999001;
const TEST_CLIENT = 'test_client_phase6';
const TEST_PHONE = '919999999999';
const TEST_HASH = 'testhash';

async function cleanRedisKeys() {
    const keys = await redis.keys(`*999001*`);
    const extras = await redis.keys(`*test_phase6*`);
    const webhookKeys = await redis.keys(`webhook:processed:test_order*`);
    const rateKeys = await redis.keys(`ratelimit:msg:${TEST_PHONE}`);
    const allKeys = [...keys, ...extras, ...webhookKeys, ...rateKeys];
    if (allKeys.length > 0) await redis.del(...allKeys);
}

beforeAll(async () => { await cleanRedisKeys(); });
afterAll(async () => {
    await cleanRedisKeys();
    await redis.quit();
});

// ─── L3-01: setHardReservation — first call succeeds ─────────────────────────
describe('L3-01: setHardReservation — SET NX succeeds on first call', () => {
    afterEach(async () => { await releaseHardReservation(TEST_PRODUCT_ID); });

    const data: ReservationData = {
        productId: TEST_PRODUCT_ID,
        clientId: TEST_CLIENT,
        customerPhone: TEST_PHONE,
        hashId: TEST_HASH,
        reservedAt: Date.now(),
    };

    it('returns true on first acquisition', async () => {
        const result = await setHardReservation(TEST_PRODUCT_ID, data);
        expect(result).toBe(true);
    });

    it('returns false on second acquisition (already locked)', async () => {
        await setHardReservation(TEST_PRODUCT_ID, data); // first
        const result2 = await setHardReservation(TEST_PRODUCT_ID, data); // second — should fail
        expect(result2).toBe(false);
    });
});

// ─── L3-02: Race condition — only 1 of 2 concurrent locks wins ───────────────
describe('L3-02: Concurrent setHardReservation — exactly 1 winner', () => {
    afterAll(async () => { await releaseHardReservation(TEST_PRODUCT_ID); });

    it('exactly one returns true out of 2 concurrent calls', async () => {
        await releaseHardReservation(TEST_PRODUCT_ID); // ensure clean
        const data: ReservationData = {
            productId: TEST_PRODUCT_ID, clientId: TEST_CLIENT,
            customerPhone: TEST_PHONE, hashId: TEST_HASH, reservedAt: Date.now(),
        };
        const [r1, r2] = await Promise.all([
            setHardReservation(TEST_PRODUCT_ID, data),
            setHardReservation(TEST_PRODUCT_ID, { ...data, customerPhone: '918888888888' }),
        ]);
        const successCount = [r1, r2].filter(Boolean).length;
        expect(successCount).toBe(1); // EXACTLY one winner — no double booking
    });
});

// ─── L3-03: extendToPaymentInitiated — TTL increases ─────────────────────────
describe('L3-03: extendToPaymentInitiated — Timer extended to 900s', () => {
    afterAll(async () => { await releaseHardReservation(TEST_PRODUCT_ID); });

    it('lock TTL goes from ~600 to ~900 after extension', async () => {
        await releaseHardReservation(TEST_PRODUCT_ID);
        const data: ReservationData = {
            productId: TEST_PRODUCT_ID, clientId: TEST_CLIENT,
            customerPhone: TEST_PHONE, hashId: TEST_HASH, reservedAt: Date.now(),
        };
        await setHardReservation(TEST_PRODUCT_ID, data);

        const ttlBefore = await redis.ttl(`reserve:item:${TEST_PRODUCT_ID}:lock`);
        expect(ttlBefore).toBeGreaterThan(590); // Was set to 600

        await extendToPaymentInitiated(TEST_PRODUCT_ID);
        const ttlAfter = await redis.ttl(`reserve:item:${TEST_PRODUCT_ID}:lock`);
        expect(ttlAfter).toBeGreaterThan(880); // Should now be ~900
        expect(ttlAfter).toBeGreaterThan(ttlBefore); // Must have increased
    });
});

// ─── L3-04: Grace window roundtrip ───────────────────────────────────────────
describe('L3-04: Grace window — set, get, delete', () => {
    afterAll(async () => { await deleteGraceWindow(TEST_PRODUCT_ID); });

    it('stores and retrieves grace window data correctly', async () => {
        const graceData = { originalPhone: TEST_PHONE, clientId: TEST_CLIENT, expiredAt: Date.now() };
        await setGraceWindow(TEST_PRODUCT_ID, graceData);
        const retrieved = await getGraceWindow(TEST_PRODUCT_ID);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.originalPhone).toBe(TEST_PHONE);
        expect(retrieved!.clientId).toBe(TEST_CLIENT);
    });

    it('deleteGraceWindow clears it', async () => {
        await deleteGraceWindow(TEST_PRODUCT_ID);
        const retrieved = await getGraceWindow(TEST_PRODUCT_ID);
        expect(retrieved).toBeNull();
    });
});

// ─── L3-05: Webhook idempotency gate ─────────────────────────────────────────
describe('L3-05: Webhook idempotency — isWebhookProcessed / markWebhookProcessed', () => {
    const TEST_ORDER_ID = `test_order_${Date.now()}`;
    afterAll(async () => { await redis.del(`webhook:processed:${TEST_ORDER_ID}`); });

    it('returns false before marking', async () => {
        const result = await isWebhookProcessed(TEST_ORDER_ID);
        expect(result).toBe(false);
    });

    it('returns true after marking', async () => {
        await markWebhookProcessed(TEST_ORDER_ID);
        const result = await isWebhookProcessed(TEST_ORDER_ID);
        expect(result).toBe(true);
    });

    it('confirming second processing returns true (idempotent gate)', async () => {
        const result = await isWebhookProcessed(TEST_ORDER_ID);
        expect(result).toBe(true); // still shows true — no re-processing
    });
});

// ─── L3-06: Session state roundtrip ─────────────────────────────────────────
describe('L3-06: Session state — setSessionState / getSessionState', () => {
    afterAll(async () => {
        await redis.del(`session:customer:${TEST_CLIENT}:${TEST_PHONE}`);
    });

    it('stores and retrieves session data correctly', async () => {
        const sessionData = {
            reservationState: 'hard_reserved',
            paymentLink: 'https://mock.cashfree/pay/test',
            productId: TEST_PRODUCT_ID,
            expiresAt: Date.now() + 600_000,
        };
        await setSessionState(TEST_CLIENT, TEST_PHONE, sessionData);
        const retrieved = await getSessionState(TEST_CLIENT, TEST_PHONE);
        expect(retrieved).not.toBeNull();
        expect(retrieved.reservationState).toBe('hard_reserved');
        expect(retrieved.productId).toBe(TEST_PRODUCT_ID);
    });
});

// ─── L3-07: Rate limiter — increments correctly ──────────────────────────────
describe('L3-07: incrementRateLimit — counts messages per phone', () => {
    afterAll(async () => { await redis.del(`ratelimit:msg:${TEST_PHONE}`); });

    it('first call returns 1', async () => {
        await redis.del(`ratelimit:msg:${TEST_PHONE}`); // clean start
        const count = await incrementRateLimit(TEST_PHONE);
        expect(count).toBe(1);
    });

    it('second call returns 2', async () => {
        const count = await incrementRateLimit(TEST_PHONE);
        expect(count).toBe(2);
    });

    it('key has a TTL of ~60 seconds', async () => {
        const ttl = await redis.ttl(`ratelimit:msg:${TEST_PHONE}`);
        expect(ttl).toBeGreaterThan(55);
        expect(ttl).toBeLessThanOrEqual(60);
    });
});

// ─── L3-08: releaseHardReservation — both keys deleted ───────────────────────
describe('L3-08: releaseHardReservation — cleans both lock and status keys', () => {
    it('deletes lock and status keys', async () => {
        const data: ReservationData = {
            productId: TEST_PRODUCT_ID, clientId: TEST_CLIENT,
            customerPhone: TEST_PHONE, hashId: TEST_HASH, reservedAt: Date.now(),
        };
        await setHardReservation(TEST_PRODUCT_ID, data);
        // Both keys should exist
        const lockBefore = await redis.exists(`reserve:item:${TEST_PRODUCT_ID}:lock`);
        const statusBefore = await redis.exists(`reserve:item:${TEST_PRODUCT_ID}:status`);
        expect(lockBefore).toBe(1);
        expect(statusBefore).toBe(1);

        await releaseHardReservation(TEST_PRODUCT_ID);

        const lockAfter = await redis.exists(`reserve:item:${TEST_PRODUCT_ID}:lock`);
        const statusAfter = await redis.exists(`reserve:item:${TEST_PRODUCT_ID}:status`);
        expect(lockAfter).toBe(0);
        expect(statusAfter).toBe(0);
    });
});
