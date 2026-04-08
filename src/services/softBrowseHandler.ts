/**
 * softBrowseHandler.ts — Soft Social Proof Nudge System
 *
 * When Customer A views a product, a 30-min soft browse Redis key is set.
 * If Customer B views the SAME product_id and A's key is still active,
 * B gets a gentle one-time urgency nudge appended to the bot's response.
 *
 * Per spec Section 8 of the KYC Addendum.
 */
import { redis } from './redis';

/**
 * Sets a 30-minute soft browse session for this customer+product combination.
 * Called when AI intent = "browse" and a specific product is being viewed.
 */
export async function setSoftBrowseSession(
    productId: number,
    clientId: string,
    phone: string
): Promise<void> {
    const key = `browse:item:${productId}:${phone}`;
    await redis.set(key, JSON.stringify({ phone, clientId, viewedAt: Date.now() }), 'EX', 1800);
}

/**
 * Scans Redis for other active browse sessions on the same product.
 * Uses SCAN (not KEYS) to avoid blocking Redis.
 * Returns null if no nudge needed, or the nudge text to append.
 */
export async function checkSoftNudge(
    productId: number,
    _clientId: string,
    currentPhone: string
): Promise<string | null> {
    // Guard: Only show once per product per viewer per hour
    const nudgeSentKey = `nudge:sent:${productId}:${currentPhone}`;
    const alreadySent = await redis.get(nudgeSentKey);
    if (alreadySent) return null;

    // Scan for OTHER active browse sessions on this exact product_id
    const pattern = `browse:item:${productId}:*`;
    const activeKeys = await redisScan(pattern);

    // Filter out the current viewer's own key
    const othersViewing = activeKeys.filter(k => !k.endsWith(`:${currentPhone}`));
    if (othersViewing.length === 0) return null;

    // Mark nudge as sent — prevents repeat for 1 hour
    await redis.set(nudgeSentKey, 'sent', 'EX', 3600);

    // Return soft Hinglish nudge text — factual and non-deceptive
    return `\n\n👀 _Ek aur customer bhi yahi phone dekh raha hai abhi — agar lena ho toh jaldi decide karo!_`;
}

/**
 * Wrapper around SCAN to avoid blocking Redis with KEYS.
 * Iterates through all matching keys safely.
 */
async function redisScan(pattern: string): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';
    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        results.push(...keys);
    } while (cursor !== '0');
    return results;
}
