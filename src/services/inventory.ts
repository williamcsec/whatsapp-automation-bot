import { query } from './db';
import crypto from 'crypto';
import { Product } from './products';

// The grouped representation that goes to the AI
export interface GroupedProduct {
    id: string; // hash_id equivalent for AI
    title: string; // name equivalent to AI
    brief: string | null; // description equivalent for AI
    price: number;
    category: string | null;
    images: string[]; // image_url equivalent for AI (array)
    stock: number;
    item_type: 'physical' | 'virtual';
}

/**
 * Returns available inventory grouped by exactly matching Name, Price, Description, and Image.
 * Generates a deterministc hash_id so the AI can say "I want hash_id X", 
 * and we can find a matching real DB product id.
 */
export async function getGroupedAvailableProducts(clientId: string): Promise<GroupedProduct[]> {
    const sql = `
        SELECT 
            name, 
            description, 
            price, 
            category, 
            image_url,
            item_type,
            COUNT(*) as stock
        FROM products 
        WHERE client_id = $1 AND status = 'available'
        GROUP BY name, description, price, category, image_url, item_type
        ORDER BY name ASC;
    `;

    const result = await query(sql, [clientId]);

    return result.rows.map(row => {
        const hashInput = `${row.name}-${row.price}-${row.description || ''}-${row.image_url || ''}`;
        const hashId = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);
        return {
            id: hashId, // Match AI prompt 'id'
            title: row.name, // Match AI prompt 'title'
            brief: row.description, // Match AI prompt 'brief'
            price: Number(row.price),
            category: row.category,
            images: row.image_url ? [row.image_url] : [], // Match AI prompt 'images'
            stock: Number(row.stock),
            item_type: row.item_type ?? 'physical',
        };
    });
}

/**
 * Given a hash_id created by getGroupedAvailableProducts, this finds and LOCKS ONE real available
 * product ID in the database using FOR UPDATE SKIP LOCKED — this prevents two buyers from
 * allocating the same product simultaneously (Fix 4: race condition elimination).
 *
 * @param clientId  - The WABA client ID
 * @param hashId    - MD5 hash from the AI identifying the product group
 * @param dbClient  - Optional: a Postgres client in an active transaction (for Fix 5)
 * @returns The real DB product ID, or null if sold out
 */
export async function allocateSpecificProduct(
    clientId: string,
    hashId: string,
    dbClient?: any
): Promise<number | null> {
    // Step 1: Fetch all available products for this client to recompute hashes.
    // We need name/description/price/image_url to reproduce the same MD5 hash the AI used.
    const execQuery = dbClient
        ? (sql: string, params: any[]) => dbClient.query(sql, params)
        : (sql: string, params: any[]) => query(sql, params);

    const fetchSql = `
        SELECT id, name, description, price, image_url 
        FROM products 
        WHERE client_id = $1 AND status = 'available'
    `;
    const result = await execQuery(fetchSql, [clientId]);

    // Step 2: Find which product ID matches the given hash
    let targetId: number | null = null;
    for (const row of result.rows) {
        const hashInput = `${row.name}-${row.price}-${row.description || ''}-${row.image_url || ''}`;
        const computedHash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);
        if (computedHash === hashId) {
            targetId = row.id;
            break;
        }
    }

    if (!targetId) return null; // Hash not matching any available product

    // Step 3: FIX 4 — Atomically re-select & lock this exact row using FOR UPDATE SKIP LOCKED.
    // This is the critical safety gate: if two buyers try this simultaneously, Postgres will
    // give one of them the lock and the other will get zero rows back (SKIP LOCKED).
    const lockSql = `
        SELECT id FROM products
        WHERE id = $1 AND client_id = $2 AND status = 'available'
        FOR UPDATE SKIP LOCKED
    `;
    const lockResult = await execQuery(lockSql, [targetId, clientId]);

    if (!lockResult.rows[0]) {
        console.warn(`[INVENTORY] Product ${targetId} was snatched by another buyer (FOR UPDATE SKIP LOCKED). Returning null.`);
        return null; // Another concurrent buyer got it first
    }

    return targetId;
}
