/**
 * Layer 4: HTTP Endpoint Tests (Supertest)
 * Tests the full Express application with real routes.
 * External APIs (Cashfree, YCloud, Groq) are mocked so no real money moves.
 */
import request from 'supertest';
import { app } from '../app';
import { query } from '../services/db';
import crypto from 'crypto';

jest.mock('../services/ycloud', () => ({
    ...jest.requireActual('../services/ycloud'),
    sendWhatsAppMessage: jest.fn().mockResolvedValue({})
}));

jest.mock('../services/groq', () => ({
    ...jest.requireActual('../services/groq'),
    detectIntent: jest.fn().mockResolvedValue({ intent: 'general', action: 'general_chat', confidence: 0.9, products: [] })
}));

const TEST_CLIENT = 'test_client_phase6';
const TEST_WABA_ID = 'test_client_phase6'; // clientId = waba_id
const TEST_PHONE = '919999999999';

// ─── Shared YCloud webhook payload builder ────────────────────────────────────
function makeYCloudPayload(text: string, overrides: Record<string, any> = {}) {
    return {
        id: `evt_${Date.now()}`,
        type: 'whatsapp.inbound_message.received',
        apiVersion: '2',
        createTime: new Date().toISOString(),
        whatsappInboundMessage: {
            id: `wamid_${Date.now()}`,
            wabaId: TEST_WABA_ID,
            phoneNumber: '+919876543210',
            from: TEST_PHONE,
            type: 'text',
            timestamp: String(Math.floor(Date.now() / 1000)),
            text: { body: text },
            ...overrides,
        }
    };
}

// ─── Cashfree webhook payload builder ────────────────────────────────────────
function makeCashfreePayload(type: string, orderId: string, paidAmount: number = 55000) {
    return {
        type,
        data: {
            order: { order_id: orderId, order_amount: paidAmount },
            payment: {
                cf_payment_id: `cfpay_${Date.now()}`,
                payment_amount: paidAmount,
                payment_group: 'upi',
                payment_message: 'Payment success',
            }
        }
    };
}

function makeCashfreeSignature(timestamp: string, body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}${body}`).digest('base64');
}

const CF_SECRET = process.env.CASHFREE_SECRET_KEY || 'test_cashfree_secret';
const CF_TIMESTAMP = String(Math.floor(Date.now() / 1000));

async function cleanupTestData() {
    await query(`DELETE FROM reservation_audit WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM waitlists WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM pending_orders WHERE client_id = $1`, [TEST_CLIENT]);
    await query(`DELETE FROM products WHERE client_id = $1`, [TEST_CLIENT]);
}

afterAll(async () => { await cleanupTestData(); });

// ─── L4-01: Non-message event → ignored ──────────────────────────────────────
describe('L4-01: POST /webhook/whatsapp-incoming — non-message event', () => {
    it('returns 200 ignored_non_message_event for status updates', async () => {
        const statusPayload = {
            id: 'evt_status',
            type: 'whatsapp.message.updated',
            apiVersion: '2',
            createTime: new Date().toISOString(),
            whatsappMessage: { id: 'wamid.x', status: 'delivered' }
        };
        const res = await request(app)
            .post('/webhook/whatsapp-incoming')
            .send(statusPayload)
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ignored_non_message_event');
    });
});

// ─── L4-02: Rate limiter gate ─────────────────────────────────────────────────
describe('L4-02: POST /webhook/whatsapp-incoming — rate limiter blocks spam', () => {
    it('returns rate_limited when counter exceeds 60', async () => {
        // Pre-set the rate limit key to 61
        const { redis } = await import('../services/redis');
        await redis.set(`ratelimit:msg:${TEST_PHONE}`, '61', 'EX', 60);

        const res = await request(app)
            .post('/webhook/whatsapp-incoming')
            .send(makeYCloudPayload('hi there'))
            .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('rate_limited');

        await redis.del(`ratelimit:msg:${TEST_PHONE}`);
    });
});

// ─── L4-03: Session gate — active reservation returns status ─────────────────
describe('L4-03: POST /webhook/whatsapp-incoming — session gate during active reservation', () => {
    it('returns session_active_returned without calling AI', async () => {
        const { setSessionState, redis } = await import('../services/redis');
        await setSessionState(TEST_CLIENT, TEST_PHONE, {
            reservationState: 'hard_reserved',
            paymentLink: 'https://mock.cashfree/test',
            productId: 999001,
            expiresAt: Date.now() + 600_000,
        });

        // Clear ratelimit to allow through
        await redis.del(`ratelimit:msg:${TEST_PHONE}`);

        const res = await request(app)
            .post('/webhook/whatsapp-incoming')
            .send(makeYCloudPayload('what is the status?'))
            .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('session_active_returned');

        // Cleanup session
        await redis.del(`session:customer:${TEST_CLIENT}:${TEST_PHONE}`);
    });
});

// ─── L4-04: Cashfree — invalid signature rejected silently ───────────────────
describe('L4-04: POST /webhook/cashfree — invalid HMAC signature', () => {
    it('returns 200 OK (not 401) with wrong signature — per spec to prevent retry loops', async () => {
        const body = makeCashfreePayload('PAYMENT_SUCCESS_WEBHOOK', 'fake_order_001');
        const res = await request(app)
            .post('/webhook/cashfree')
            .send(body)
            .set('Content-Type', 'application/json')
            .set('x-webhook-signature', 'WRONG_SIGNATURE')
            .set('x-webhook-timestamp', CF_TIMESTAMP);
        expect(res.status).toBe(200);
    });
});

// ─── L4-05: Cashfree — missing header returns 400 ────────────────────────────
describe('L4-05: POST /webhook/cashfree — missing signature headers', () => {
    it('returns 400 when x-webhook-signature is absent', async () => {
        const res = await request(app)
            .post('/webhook/cashfree')
            .send({ type: 'PAYMENT_SUCCESS_WEBHOOK' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
    });
});

// ─── L4-06: Cashfree — PAYMENT_INITIATED extends timer ───────────────────────
describe('L4-06: POST /webhook/cashfree — PAYMENT_INITIATED extends reservation timer', () => {
    let productId: number;
    let orderId: string;

    beforeAll(async () => {
        // Ensure test client exists
        await query(`INSERT INTO clients (client_id, business_name) VALUES ($1,$2) ON CONFLICT (client_id) DO NOTHING`,
            [TEST_CLIENT, 'Phase6 Test']);
        // Insert a product and pending order
        const pr = await query(
            `INSERT INTO products (client_id, name, price, status, item_type)
             VALUES ($1,'CF Timer Test',55000,'reserved','physical') RETURNING id`,
            [TEST_CLIENT]
        );
        productId = pr.rows[0].id;
        orderId = `cf_init_${Date.now()}`;
        const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const randOrderId = Math.floor(Math.random() * 1000000);
        await query(
            `INSERT INTO pending_orders (client_id, order_id, customer_phone, product_id, product_name,
             product_price, cf_order_id, payment_link, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9)`,
            [TEST_CLIENT, randOrderId, TEST_PHONE, productId, 'CF Timer Test', 55000, orderId,
                `https://mock.cashfree.com/${orderId}`, exp]
        );
        // Set the Redis lock so extendToPaymentInitiated finds it
        const { setHardReservation } = await import('../services/redis');
        await setHardReservation(productId, { productId, clientId: TEST_CLIENT, customerPhone: TEST_PHONE, hashId: 'x', reservedAt: Date.now() });
    });

    afterAll(async () => {
        const { releaseHardReservation } = await import('../services/redis');
        await releaseHardReservation(productId);
        await query(`DELETE FROM pending_orders WHERE cf_order_id = $1`, [orderId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('returns 200 OK and DB status changes to payment_initiated', async () => {
        const body = makeCashfreePayload('PAYMENT_INITIATED_WEBHOOK', orderId);
        const bodyString = JSON.stringify(body);
        const sig = makeCashfreeSignature(CF_TIMESTAMP, bodyString, CF_SECRET);

        const res = await request(app)
            .post('/webhook/cashfree')
            .set('Content-Type', 'application/json')
            .set('x-webhook-signature', sig)
            .set('x-webhook-timestamp', CF_TIMESTAMP)
            .send(body);

        expect(res.status).toBe(200);

        const dbResult = await query(
            `SELECT status FROM pending_orders WHERE cf_order_id = $1`, [orderId]
        );
        expect(dbResult.rows[0]?.status).toBe('payment_initiated');
    });
});

// ─── L4-07: Cashfree — amount mismatch fraud guard ───────────────────────────
describe('L4-07: POST /webhook/cashfree — amount mismatch fraud guard', () => {
    let productId: number;
    let orderId: string;

    beforeAll(async () => {
        await query(`INSERT INTO clients (client_id, business_name) VALUES ($1,$2) ON CONFLICT (client_id) DO NOTHING`,
            [TEST_CLIENT, 'Phase6 Test']);
        const pr = await query(
            `INSERT INTO products (client_id, name, price, status, item_type)
             VALUES ($1,'Fraud Guard Test',55000,'reserved','physical') RETURNING id`,
            [TEST_CLIENT]
        );
        productId = pr.rows[0].id;
        orderId = `cf_fraud_${Date.now()}`;
        const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const randOrderId = Math.floor(Math.random() * 1000000);
        await query(
            `INSERT INTO pending_orders (client_id, order_id, customer_phone, product_id, product_name,
             product_price, cf_order_id, payment_link, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9)`,
            [TEST_CLIENT, randOrderId, TEST_PHONE, productId, 'Fraud Guard Test', 55000,
                orderId, `https://mock.cashfree.com/${orderId}`, exp]
        );
    });

    afterAll(async () => {
        await query(`DELETE FROM reservation_audit WHERE order_id IN (SELECT id FROM pending_orders WHERE cf_order_id = $1)`, [orderId]);
        await query(`DELETE FROM pending_orders WHERE cf_order_id = $1`, [orderId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('returns 200 OK but does NOT mark order paid (amount mismatch)', async () => {
        // Send payment_amount = 1 but product costs 55000
        const body = makeCashfreePayload('PAYMENT_SUCCESS_WEBHOOK', orderId, 1);
        const bodyString = JSON.stringify(body);
        const sig = makeCashfreeSignature(CF_TIMESTAMP, bodyString, CF_SECRET);

        const res = await request(app)
            .post('/webhook/cashfree')
            .set('Content-Type', 'application/json')
            .set('x-webhook-signature', sig)
            .set('x-webhook-timestamp', CF_TIMESTAMP)
            .send(body);

        expect(res.status).toBe(200);

        // Product should still be reserved, NOT sold
        const prodResult = await query(`SELECT status FROM products WHERE id = $1`, [productId]);
        expect(prodResult.rows[0].status).toBe('reserved');

        // Audit log should have fraud_suspected
        const auditResult = await query(
            `SELECT * FROM reservation_audit WHERE trigger_event = 'amount_mismatch' AND product_id = $1`,
            [productId]
        );
        expect(auditResult.rows.length).toBeGreaterThan(0);
    });
});

// ─── L4-08: Cashfree — idempotency (double webhook) ─────────────────────────
describe('L4-08: POST /webhook/cashfree — double webhook idempotency', () => {
    let productId: number;
    let orderId: string;

    beforeAll(async () => {
        await query(`INSERT INTO clients (client_id, business_name) VALUES ($1,$2) ON CONFLICT (client_id) DO NOTHING`,
            [TEST_CLIENT, 'Phase6 Test']);
        const pr = await query(
            `INSERT INTO products (client_id, name, price, status, item_type)
             VALUES ($1,'Idempotency Test',55000,'reserved','physical') RETURNING id`,
            [TEST_CLIENT]
        );
        productId = pr.rows[0].id;
        orderId = `cf_idem_${Date.now()}`;
        const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const randOrderId = Math.floor(Math.random() * 1000000);
        await query(
            `INSERT INTO pending_orders (client_id, order_id, customer_phone, product_id, product_name,
             product_price, cf_order_id, payment_link, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9)`,
            [TEST_CLIENT, randOrderId, TEST_PHONE, productId, 'Idempotency Test', 55000,
                orderId, `https://mock.cashfree.com/${orderId}`, exp]
        );
    });

    afterAll(async () => {
        const { redis } = await import('../services/redis');
        await redis.del(`webhook:processed:${orderId}`);
        await query(`DELETE FROM reservation_audit WHERE product_id = $1`, [productId]);
        await query(`DELETE FROM waitlists WHERE product_id = $1`, [productId]);
        await query(`DELETE FROM completed_orders WHERE cf_order_id = $1`, [orderId]);
        await query(`DELETE FROM pending_orders WHERE cf_order_id = $1`, [orderId]);
        await query(`DELETE FROM products WHERE id = $1`, [productId]);
    });

    it('first success webhook fulfills order', async () => {
        const body = makeCashfreePayload('PAYMENT_SUCCESS_WEBHOOK', orderId, 55000);
        const bodyString = JSON.stringify(body);
        const sig = makeCashfreeSignature(CF_TIMESTAMP, bodyString, CF_SECRET);
        const res = await request(app)
            .post('/webhook/cashfree')
            .set('Content-Type', 'application/json')
            .set('x-webhook-signature', sig)
            .set('x-webhook-timestamp', CF_TIMESTAMP)
            .send(body);
        expect(res.status).toBe(200);
    });

    it('second identical webhook returns 200 Already processed — no re-fulfillment', async () => {
        const body = makeCashfreePayload('PAYMENT_SUCCESS_WEBHOOK', orderId, 55000);
        const bodyString = JSON.stringify(body);
        const sig = makeCashfreeSignature(CF_TIMESTAMP, bodyString, CF_SECRET);
        const res = await request(app)
            .post('/webhook/cashfree')
            .set('Content-Type', 'application/json')
            .set('x-webhook-signature', sig)
            .set('x-webhook-timestamp', CF_TIMESTAMP)
            .send(body);
        expect(res.status).toBe(200);
        expect(res.text).toContain('processed');
    });

    it('product status is sold after fulfillment (only once)', async () => {
        const r = await query(`SELECT status FROM products WHERE id = $1`, [productId]);
        expect(r.rows[0].status).toBe('sold');
    });
});
