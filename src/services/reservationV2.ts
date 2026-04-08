/**
 * reservationV2.ts — Phase 6 Reservation State Machine
 * Replaces the simple 2-minute lock from Phase 3.
 * This is the authoritative entry point for all reservation operations.
 *
 * Valid state transitions (all others throw ReservationStateError):
 *   available → hard_reserved
 *   hard_reserved → payment_initiated → payment_processing → paid_confirmed
 *   hard_reserved | payment_initiated → expired_grace → available
 *   available → virtual_pending
 */

import { query } from './db';
import {
    setHardReservation,
    releaseHardReservation,
    getReservationStatus,
    setGraceWindow,
    ReservationData,
} from './redis';
import { createPaymentLink } from './cashfree';

// ─── Custom Error ───────────────────────────────────────────────────────────
export class ReservationStateError extends Error {
    constructor(
        public fromState: string,
        public toState: string,
        public productId: number
    ) {
        super(`Invalid transition: ${fromState} → ${toState} for product ${productId}`);
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ReserveProductResult {
    success: boolean;
    reservationId?: number;
    paymentLink?: string;
    paymentLinkId?: string;
    message: string;
}

// ─── Audit Logger ────────────────────────────────────────────────────────────
async function logAudit(params: {
    clientId: string;
    productId: number;
    orderId?: number | null;
    customerPhone: string;
    fromState: string;
    toState: string;
    triggerEvent: string;
    triggeredBy?: string;
    metadata?: object;
    redisKey?: string;
}): Promise<void> {
    try {
        await query(
            `INSERT INTO reservation_audit
             (client_id, product_id, order_id, customer_phone, from_state, to_state,
              trigger_event, triggered_by, metadata, redis_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                params.clientId,
                params.productId,
                params.orderId ?? null,
                params.customerPhone,
                params.fromState,
                params.toState,
                params.triggerEvent,
                params.triggeredBy ?? 'system',
                params.metadata ? JSON.stringify(params.metadata) : null,
                params.redisKey ?? null,
            ]
        );
    } catch (err) {
        console.error('[AUDIT] Failed to log reservation state change:', err);
    }
}

// ─── Core: reserveProduct() ──────────────────────────────────────────────────
/**
 * The authoritative entry point for reserving a physical product.
 * Exact signature from spec Section 8.1.
 */
export async function reserveProduct(
    productId: number,
    clientId: string,
    customerPhone: string,
    hashId: string,
    customerDetailsId?: number | null,    // KYC Addendum: link to customer_details row
    deliveryAddress?: object | null,     // KYC Addendum: delivery snapshot for invoice
): Promise<ReserveProductResult> {

    // 1. Check if grace window is active — same buyer can reclaim
    const graceData = await (async () => {
        try {
            const { getGraceWindow } = await import('./redis');
            return await getGraceWindow(productId);
        } catch { return null; }
    })();

    if (graceData && graceData.originalPhone === customerPhone) {
        // Grace re-reservation — buyer returning within 2-min window
        await (await import('./redis')).deleteGraceWindow(productId);
    }

    // 2. Verify product is available in DB (source of truth for completed states)
    const productResult = await query(
        `SELECT id, status, item_type, price, name, client_id
         FROM products WHERE id = $1 AND client_id = $2`,
        [productId, clientId]
    );

    if (productResult.rowCount === 0) {
        await logAudit({ clientId, productId, customerPhone, fromState: 'unknown', toState: 'error', triggerEvent: 'product_not_found' });
        return { success: false, message: 'Product not found.' };
    }

    const product = productResult.rows[0];

    if (product.status === 'sold') {
        await logAudit({ clientId, productId, customerPhone, fromState: 'sold', toState: 'sold', triggerEvent: 'reserve_attempt_on_sold' });
        return { success: false, message: 'Yeh item bik chuka hai — dusra dekhen!' };
    }

    if (product.item_type === 'virtual') {
        // Route to virtual handler — never create a payment link directly
        await logAudit({ clientId, productId, customerPhone, fromState: product.status, toState: 'virtual_pending', triggerEvent: 'virtual_item_reserve_attempt' });
        throw new ReservationStateError(product.status, 'virtual_pending', productId);
    }

    // 3. Attempt Redis SET NX lock (primary race protection)
    const lockData: ReservationData = {
        productId,
        clientId,
        customerPhone,
        hashId,
        reservedAt: Date.now(),
    };

    const lockAcquired = await setHardReservation(productId, lockData);

    if (!lockAcquired) {
        // Item is already hard reserved by someone else — add to waitlist
        const currentStatus = await getReservationStatus(productId);
        await logAudit({
            clientId, productId, customerPhone,
            fromState: currentStatus || 'hard_reserved',
            toState: 'waitlisted',
            triggerEvent: 'redis_lock_failed',
        });
        return { success: false, message: 'Abhi koi aur checkout kar raha hai — waitlist mein aajao!' };
    }

    // 4. Update DB — set product to reserved (atomic)
    const updateResult = await query(
        `UPDATE products SET status = 'reserved', reserved_at = NOW(), reserved_by = $1
         WHERE id = $2 AND client_id = $3 AND status = 'available'
         RETURNING id`,
        [customerPhone, productId, clientId]
    );

    if ((updateResult.rowCount ?? 0) === 0) {
        // Someone else got it between our Redis lock and DB update — rollback Redis
        await releaseHardReservation(productId);
        await logAudit({
            clientId, productId, customerPhone,
            fromState: 'available', toState: 'rollback',
            triggerEvent: 'db_update_conflict',
            redisKey: `reserve:item:${productId}:lock`,
        });
        return { success: false, message: 'Item sell ho gaya — waitlist mein hain aap!' };
    }

    // 5. Generate Cashfree payment link with 3x retry backoff
    let paymentData;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const orderId = `order_${Date.now()}_${productId}`;
            paymentData = await createPaymentLink(orderId, product.price, customerPhone, product.name);
            break;
        } catch (cfErr) {
            console.error(`[CASHFREE] Link gen attempt ${attempt} failed:`, cfErr);
            if (attempt === 3) {
                // Rollback: release Redis lock + reset product to available
                await releaseHardReservation(productId);
                await query(`UPDATE products SET status = 'available', reserved_at = NULL, reserved_by = NULL WHERE id = $1`, [productId]);
                await logAudit({
                    clientId, productId, customerPhone,
                    fromState: 'hard_reserved', toState: 'available',
                    triggerEvent: 'cashfree_link_failed_3x',
                });
                return { success: false, message: 'Payment system busy hai. 5 min mein retry karein.' };
            }
            await new Promise(r => setTimeout(r, 2000 * attempt));
        }
    }

    // 6. Create pending_order record in DB
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min (Hard Reservation timer)
    const orderResult = await query(
        `INSERT INTO pending_orders
         (client_id, customer_phone, product_id, product_name, product_price,
          payment_link, cf_order_id, original_price, product_hash_id, status, expires_at,
          customer_details_id, delivery_preference, delivery_address, kyc_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_payment',$10,$11,$12,$13,$14)
         RETURNING id`,
        [
            clientId, customerPhone, productId,
            product.name, product.price,
            paymentData!.link_url, paymentData!.link_id,
            product.price, hashId, expiresAt,
            customerDetailsId ?? null,
            deliveryAddress ? 'delivery' : 'pickup',
            deliveryAddress ? JSON.stringify(deliveryAddress) : null,
            customerDetailsId ? 'confirmed' : 'not_started',
        ]
    );

    const orderId = orderResult.rows[0].id;

    // 7. Log the happy-path audit trail
    await logAudit({
        clientId, productId, orderId, customerPhone,
        fromState: 'available', toState: 'hard_reserved',
        triggerEvent: 'buyer_initiated_checkout',
        triggeredBy: 'customer',
        redisKey: `reserve:item:${productId}:lock`,
    });

    return {
        success: true,
        reservationId: orderId,
        paymentLink: paymentData!.link_url,
        paymentLinkId: paymentData!.link_id,
        message: `✅ Reserved! Pay ₹${product.price} within 10 minutes.\n\nLink: ${paymentData!.link_url}`,
    };
}

// ─── releaseReservation() ────────────────────────────────────────────────────
/**
 * Releases a reservation fully — Redis lock + DB product status.
 * Used by expiry handler, payment failure, and discount timeout.
 */
export async function releaseReservation(
    productId: number,
    clientId: string,
    reason: string
): Promise<void> {
    const currentStatus = await getReservationStatus(productId) || 'unknown';

    await releaseHardReservation(productId);
    await query(
        `UPDATE products SET status = 'available', reserved_at = NULL, reserved_by = NULL
         WHERE id = $1 AND client_id = $2`,
        [productId, clientId]
    );

    // Also expire any active pending_order
    await query(
        `UPDATE pending_orders SET status = 'expired', last_state_change_at = NOW()
         WHERE product_id = $1 AND client_id = $2
           AND status IN ('pending_payment','payment_initiated','payment_processing','discount_hold')`,
        [productId, clientId]
    );

    await logAudit({
        clientId, productId, customerPhone: 'system',
        fromState: currentStatus, toState: 'available',
        triggerEvent: reason, triggeredBy: 'system',
    });
}

// Re-export logAudit for use by other Phase 6 services
export { logAudit };
