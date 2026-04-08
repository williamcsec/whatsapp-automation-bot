/**
 * discountHandler.ts — Phase 6 Discount Negotiation
 * Holds the reservation alive during manager approval.
 * Discount window: 15 minutes per spec Section 9.
 */
import { query } from './db';
import { redis } from './redis';
import { createPaymentLink } from './cashfree';
import { releaseReservation, logAudit } from './reservationV2';
import { notifyNextInWaitlist } from './waitlist';
import { sendWhatsAppMessage } from './ycloud';

// ─── discountHandler ──────────────────────────────────────────────────────────
export async function discountHandler(
    productId: number,
    clientId: string,
    customerPhone: string,
    requestedPrice: number
): Promise<void> {
    // Set discount hold state — 15-min window for manager response
    const discountExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const discountKey = `discount:approved:${productId}:${customerPhone}`;

    try {
        await redis.set(discountKey, JSON.stringify({ requestedPrice, requestedAt: Date.now(), status: 'pending' }), 'EX', 900);
    } catch { /* non-critical */ }

    // Update pending_order to discount_hold status
    await query(
        `UPDATE pending_orders
         SET status = 'discount_hold', expires_at = $1, last_state_change_at = NOW()
         WHERE product_id = $2 AND client_id = $3
           AND status IN ('pending_payment','payment_initiated')`,
        [discountExpiry, productId, clientId]
    );

    await logAudit({
        clientId, productId, customerPhone,
        fromState: 'hard_reserved', toState: 'discount_hold',
        triggerEvent: 'price_negotiation_started',
        metadata: { requestedPrice },
        redisKey: discountKey,
    });

    await sendWhatsAppMessage(
        customerPhone,
        `Aapki discount request manager ke paas gayi! 15 minute mein reply milega. Reservation abhi bhi aapke paas hai. ✅`
    );
}

// ─── approveDiscount ──────────────────────────────────────────────────────────
export async function approveDiscount(
    productId: number,
    clientId: string,
    customerPhone: string,
    managerId: string,
    approvedPrice: number
): Promise<void> {
    // Reset Redis TTL to 10 min (fresh reservation)
    const discountKey = `discount:approved:${productId}:${customerPhone}`;
    try {
        await redis.set(discountKey, JSON.stringify({ approvedPrice, approvedAt: Date.now(), managerId, status: 'approved' }), 'EX', 600);
    } catch { /* non-critical */ }

    // Get product details for new payment link
    const productResult = await query(`SELECT name, price FROM products WHERE id = $1`, [productId]);
    const product = productResult.rows[0];

    // Generate new payment link at approved price
    const orderId = `disc_${Date.now()}_${productId}`;
    const paymentData = await createPaymentLink(orderId, approvedPrice, customerPhone, product.name);

    // Update pending_order with approved price and new payment link
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
        `UPDATE pending_orders
         SET status = 'pending_payment', approved_price = $1, discount_approved_by = $2,
             payment_link = $3, cf_order_id = $4, expires_at = $5, last_state_change_at = NOW()
         WHERE product_id = $6 AND client_id = $7
           AND status = 'discount_hold'`,
        [approvedPrice, managerId, paymentData.link_url, paymentData.link_id, newExpiry, productId, clientId]
    );

    await logAudit({
        clientId, productId, customerPhone,
        fromState: 'discount_hold', toState: 'hard_reserved',
        triggerEvent: 'discount_approved',
        triggeredBy: `manager:${managerId}`,
        metadata: { approvedPrice },
        redisKey: discountKey,
    });

    await sendWhatsAppMessage(
        customerPhone,
        `✅ Manager ne aapki discount approve kar di!\n\n₹${approvedPrice} mein le sakte hain. 10 minute mein pay karein:\n\n${paymentData.link_url}`
    );
}

// ─── rejectDiscount ───────────────────────────────────────────────────────────
export async function rejectDiscount(
    productId: number,
    clientId: string,
    customerPhone: string,
    managerId: string
): Promise<void> {
    const discountKey = `discount:approved:${productId}:${customerPhone}`;
    try { await redis.del(discountKey); } catch { /* noop */ }

    await releaseReservation(productId, clientId, 'discount_rejected_by_manager');

    await logAudit({
        clientId, productId, customerPhone,
        fromState: 'discount_hold', toState: 'available',
        triggerEvent: 'discount_rejected',
        triggeredBy: `manager:${managerId}`,
    });

    await sendWhatsAppMessage(
        customerPhone,
        `Manager ne discount reject kar diya. Normal price ₹${(await query('SELECT price FROM products WHERE id=$1', [productId])).rows[0]?.price} pe buy kar sakte hain! 😊`
    );

    await notifyNextInWaitlist(productId, clientId);
}
