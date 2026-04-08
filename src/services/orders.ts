import { query } from './db';

/**
 * Creates a record in the pending_orders table when a user initiates checkout.
 */
export async function createPendingOrder(
    clientId: string,
    customerPhone: string,
    productId: number,
    paymentLinkId: string,
    amount: number
): Promise<number> {
    const minExpiry = new Date();
    // Phase 6 specifies 10 minutes for physical, 30 min for virtual. Let's default to 10 here, expiryHandler manages the rest
    minExpiry.setMinutes(minExpiry.getMinutes() + 10);

    // Generate a pseudo-random integer for order_id since the schema requires it NOT NULL
    const randomOrderId = Math.floor(Math.random() * 1000000);

    const sql = `
        INSERT INTO pending_orders (
            client_id,
            order_id,
            customer_phone,
            product_id,
            product_price,
            cf_order_id,
            payment_link,
            status,
            expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
    `;

    const values = [
        clientId,
        randomOrderId, // order_id (required NOT NULL)
        customerPhone,
        productId,
        amount, // maps to product_price
        paymentLinkId, // cf_order_id
        `https://sandbox.cashfree.com/links/${paymentLinkId}`, // mock payment_link string for now, updated later
        'pending_payment',
        minExpiry.toISOString()
    ];

    const result = await query(sql, values);
    return result.rows[0].id;
}

export interface PendingOrder {
    id: number;
    client_id: string;
    customer_phone: string;
    product_id: number;
    payment_link_id: string;
    payment_link: string | null;               // Phase 6: actual URL for retry messages
    amount: number;
    approved_price: number | null;             // Phase 6: discount-approved price
    customer_details_id: number | null;        // KYC Addendum: FK to customer_details
    delivery_preference: string | null;        // KYC Addendum: 'pickup' | 'delivery'
    delivery_address: Record<string, any> | null; // KYC Addendum: delivery snapshot
    status: string;
}

/**
 * Retrieves a pending order strictly using the Cashfree Payment Link ID.
 */
export async function getOrderByPaymentLinkId(paymentLinkId: string): Promise<PendingOrder | null> {
    const sql = `
        SELECT po.id, po.client_id, po.customer_phone, po.product_id,
               po.cf_order_id AS payment_link_id,
               po.payment_link, po.product_price AS amount,
               po.approved_price, po.status,
               po.customer_details_id, po.delivery_preference, po.delivery_address,
               cd.full_name  AS customer_full_name,
               cd.email      AS customer_email
        FROM pending_orders po
        LEFT JOIN customer_details cd ON cd.id = po.customer_details_id
        WHERE po.cf_order_id = $1
    `;
    const result = await query<PendingOrder & { customer_full_name?: string; customer_email?: string }>(sql, [paymentLinkId]);
    return result.rows[0] || null;
}

/**
 * Marks an order as paid_confirmed to ensure idempotency (preventing double processing).
 * Returns true if the order was successfully marked paid for the FIRST time.
 */
export async function markOrderPaid(orderId: number): Promise<boolean> {
    const sql = `
        UPDATE pending_orders 
        SET status = 'paid_confirmed' 
        WHERE id = $1 AND status != 'paid_confirmed'
        RETURNING id;
    `;
    const result = await query(sql, [orderId]);
    return (result.rowCount ?? 0) > 0;
}
