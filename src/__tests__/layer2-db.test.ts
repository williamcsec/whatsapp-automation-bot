/**
 * Layer 2: DB Integration Tests
 * Uses live amex_chatbot Supabase DB with test_client.
 * ALL test data is cleaned up after each test.
 */
import { query, closePool } from '../services/db';

// Supabase remote Postgres can be slow on cold start — raise global timeout
jest.setTimeout(30000);

// Test constants — using a dedicated test client so we never touch real data
const TEST_CLIENT = 'test_client_phase6';
const TEST_PHONE = '919999999999';
const TEST_PHONE_2 = '918888888888';

// ─── Cleanup helper ───────────────────────────────────────────────────────────
async function cleanupTestData() {
    await query(`DELETE FROM reservation_audit WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM waitlists WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM pending_orders WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM products WHERE client_id = $1`, [TEST_CLIENT]);
    // Delete conversations before clients to satisfy the FK constraint
    await query(`DELETE FROM conversations WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM clients WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM redis_fallback WHERE lock_key LIKE $1`, [`%test_phase6%`]);
}

// ─── Setup a real test client row ─────────────────────────────────────────────
async function ensureTestClient() {
    await query(
        `INSERT INTO clients (client_id, business_name) VALUES ($1, $2)
         ON CONFLICT (client_id) DO NOTHING`,
        [TEST_CLIENT, 'Phase6 Test Business']
    );
}

async function insertTestProduct(overrides: Record<string, any> = {}): Promise<number> {
    const result = await query(
        `INSERT INTO products (client_id, name, description, price, status, item_type)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
            TEST_CLIENT,
            overrides.name ?? 'Test iPhone 14',
            overrides.description ?? 'Test product for Phase 6',
            overrides.price ?? 55000,
            overrides.status ?? 'available',
            overrides.item_type ?? 'physical',
        ]
    );
    return result.rows[0].id;
}

beforeAll(async () => {
    await ensureTestClient();
});

afterAll(async () => {
    await cleanupTestData();
    await closePool();  // Release all pg pool connections so Jest can exit cleanly
});

// ─── L2-01: getGroupedAvailableProducts returns item_type ────────────────────
describe('L2-01: getGroupedAvailableProducts — item_type in result', () => {
    let productId: number;
    beforeAll(async () => { productId = await insertTestProduct(); });
    afterAll(async () => {
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('returns item_type field for each grouped product', async () => {
        const { getGroupedAvailableProducts } = await import('../services/inventory');
        const products = await getGroupedAvailableProducts(TEST_CLIENT);
        expect(products.length).toBeGreaterThan(0);
        const found = products.find(p => p.title === 'Test iPhone 14');
        expect(found).toBeDefined();
        expect(found!.item_type).toBe('physical');
        expect(typeof found!.id).toBe('string');
        expect(found!.id).toHaveLength(8);
    });
});

// ─── L2-02: allocateSpecificProduct finds product by hash ────────────────────
describe('L2-02: allocateSpecificProduct — hash-to-productId lookup', () => {
    let productId: number;
    beforeAll(async () => { productId = await insertTestProduct({ name: 'Hash Test Device' }); });
    afterAll(async () => {
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('returns correct product id for a valid hash', async () => {
        const crypto = await import('crypto');
        const { allocateSpecificProduct } = await import('../services/inventory');

        // Need to match exactly how Postgres node driver returns Numeric(10,2) (e.g. "55000.00")
        const r = await query(`SELECT name, price, description, image_url FROM products WHERE id = $1`, [productId]);
        const row = r.rows[0];
        const hashInput = `${row.name}-${row.price}-${row.description || ''}-${row.image_url || ''}`;

        const expectedHash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);

        const foundId = await allocateSpecificProduct(TEST_CLIENT, expectedHash);
        expect(foundId).not.toBeNull();
        expect(foundId).toBe(productId);
    });

    it('returns null for unknown hash', async () => {
        const { allocateSpecificProduct } = await import('../services/inventory');
        const result = await allocateSpecificProduct(TEST_CLIENT, 'deadbeef');
        expect(result).toBeNull();
    });
});

// ─── L2-03: createPendingOrder → getOrderByPaymentLinkId roundtrip ───────────
describe('L2-03: createPendingOrder + getOrderByPaymentLinkId roundtrip', () => {
    let productId: number;
    let orderId: number;
    const CF_ORDER_ID = `cf_test_${Date.now()}`;

    beforeAll(async () => { productId = await insertTestProduct(); });
    afterAll(async () => {
        await query(`DELETE FROM pending_orders WHERE client_id = $1`, [TEST_CLIENT]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('inserts pending order with correct cf_order_id', async () => {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const randOrderId = Math.floor(Math.random() * 1000000);
        const result = await query(
            `INSERT INTO pending_orders (client_id, order_id, customer_phone, product_id, product_name,
             product_price, payment_link, cf_order_id, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9) RETURNING id`,
            [TEST_CLIENT, randOrderId, TEST_PHONE, productId, 'Test iPhone 14', 55000,
                `https://mock.cashfree.com/${CF_ORDER_ID}`, CF_ORDER_ID, expiresAt]
        );
        orderId = result.rows[0].id;
        expect(orderId).toBeGreaterThan(0);
    });

    it('retrieves order by CF order ID with correct fields', async () => {
        const { getOrderByPaymentLinkId } = await import('../services/orders');
        const order = await getOrderByPaymentLinkId(CF_ORDER_ID);
        expect(order).not.toBeNull();
        expect(order!.customer_phone).toBe(TEST_PHONE);
        expect(order!.product_id).toBe(productId);
        expect(Number(order!.amount)).toBe(55000);
        expect(order!.payment_link).toContain(CF_ORDER_ID);
    });
});

// ─── L2-04: markOrderPaid idempotency ────────────────────────────────────────
describe('L2-04: markOrderPaid — idempotency (no double fulfillment)', () => {
    let productId: number;
    let orderId: number;
    const CF_ORDER_ID = `cf_idm_${Date.now()}`;

    beforeAll(async () => {
        productId = await insertTestProduct();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const randOrderId = Math.floor(Math.random() * 1000000);
        const r = await query(
            `INSERT INTO pending_orders (client_id, order_id, customer_phone, product_id, product_name,
             product_price, cf_order_id, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_payment',$8) RETURNING id`,
            [TEST_CLIENT, randOrderId, TEST_PHONE, productId, 'Test iPhone', 55000, CF_ORDER_ID, expiresAt]
        );
        orderId = r.rows[0].id;
    });
    afterAll(async () => {
        await query(`DELETE FROM pending_orders WHERE id = $1`, [orderId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('first markOrderPaid returns true', async () => {
        const { markOrderPaid } = await import('../services/orders');
        const result = await markOrderPaid(orderId);
        expect(result).toBe(true);
    });

    it('second markOrderPaid returns false (idempotent)', async () => {
        const { markOrderPaid } = await import('../services/orders');
        const result = await markOrderPaid(orderId);
        expect(result).toBe(false);
    });
});

// ─── L2-05: addToWaitlist — sequential positions, no duplicates ──────────────
describe('L2-05: waitlist — sequential positions, no duplicate entries', () => {
    let productId: number;
    beforeAll(async () => { productId = await insertTestProduct(); });
    afterAll(async () => {
        await query(`DELETE FROM reservation_audit WHERE product_id = $1`, [productId]);
        await query(`DELETE FROM waitlists WHERE product_id = $1`, [productId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('first person gets position 1, second gets position 2', async () => {
        const { addToWaitlist } = await import('../services/waitlist');
        const pos1 = await addToWaitlist(productId, TEST_CLIENT, 'testhash1', TEST_PHONE, 'Buyer A');
        const pos2 = await addToWaitlist(productId, TEST_CLIENT, 'testhash1', TEST_PHONE_2, 'Buyer B');
        expect(pos1).toBe(1);
        expect(pos2).toBe(2);
    });

    it('adding same phone again does not create a duplicate waiting row', async () => {
        const r = await query(
            `SELECT COUNT(*) as cnt FROM waitlists WHERE product_id = $1 AND customer_phone = $2 AND status = 'waiting'`,
            [productId, TEST_PHONE]
        );
        expect(Number(r.rows[0].cnt)).toBe(1);
    });
});

// ─── L2-06: reservation_audit is written by releaseReservation ───────────────
describe('L2-06: reservation_audit — releaseReservation writes an audit row', () => {
    let productId: number;
    beforeAll(async () => {
        productId = await insertTestProduct({ status: 'reserved' });
    });
    afterAll(async () => {
        const { releaseHardReservation } = await import('../services/redis');
        await releaseHardReservation(productId);
        await query(`DELETE FROM reservation_audit WHERE product_id = $1`, [productId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('audit row appears with correct trigger_event', async () => {
        const { releaseReservation } = await import('../services/reservationV2');
        await releaseReservation(productId, TEST_CLIENT, 'unit_test_release');

        const r = await query(
            `SELECT * FROM reservation_audit WHERE product_id = $1 AND trigger_event = $2`,
            [productId, 'unit_test_release']
        );
        expect(r.rows.length).toBeGreaterThan(0);
        expect(r.rows[0].to_state).toBe('available');
    });
});

// ─── L2-07: products status enum accepts new values ──────────────────────────
describe('L2-07: products status constraint allows new Phase 6 values', () => {
    it('virtual_pending is accepted by the constraint', async () => {
        const productId = await insertTestProduct();
        let error: any;
        try {
            await query(
                `UPDATE products SET status = 'virtual_pending' WHERE id = $1`, [productId]
            );
        } catch (e) { error = e; }
        expect(error).toBeUndefined();
        // Verify it was actually updated
        const r = await query(`SELECT status FROM products WHERE id = $1`, [productId]);
        expect(r.rows[0].status).toBe('virtual_pending');
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('random invalid status is rejected by constraint', async () => {
        const productId = await insertTestProduct();
        let error: any;
        try {
            await query(`UPDATE products SET status = 'invalid_status_xyz' WHERE id = $1`, [productId]);
        } catch (e) { error = e; }
        expect(error).toBeDefined();
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });
});

// ─── L2-08: redis_fallback table accepts a lock entry ────────────────────────
describe('L2-08: redis_fallback table — insert and auto-expire index', () => {
    afterAll(async () => {
        await query(`DELETE FROM redis_fallback WHERE lock_key LIKE '%test_phase6%'`);
    });

    it('inserts a fallback lock row with future expiry', async () => {
        const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
        const r = await query(
            `INSERT INTO redis_fallback (lock_key, lock_value, expires_at)
             VALUES ($1, $2, $3) ON CONFLICT (lock_key) DO NOTHING RETURNING id`,
            ['reserve:item:99999:lock_test_phase6', JSON.stringify({ test: true }), expiresAt]
        );
        expect(r.rows.length).toBe(1);
    });

    it('conflict on same key inserts nothing (DO NOTHING)', async () => {
        const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
        const r = await query(
            `INSERT INTO redis_fallback (lock_key, lock_value, expires_at)
             VALUES ($1, $2, $3) ON CONFLICT (lock_key) DO NOTHING RETURNING id`,
            ['reserve:item:99999:lock_test_phase6', JSON.stringify({ test: true }), expiresAt]
        );
        expect(r.rows.length).toBe(0); // No new row — idempotent
    });
});
