import { ENV } from '../config/env';
import crypto from 'crypto';

export interface PaymentLinkResponse {
    link_id: string;
    link_url: string;
    link_status: string;
    link_expiry_time: string;
}

/**
 * Generates a payment link via Cashfree API for the selected product/order.
 */
export async function createPaymentLink(
    orderId: string,
    amount: number,
    customerPhone: string,
    productName: string
): Promise<PaymentLinkResponse> {
    // Determine integration environment based on API key presence
    // In production, we assume ENV contains the correct production URL
    const baseUrl = ENV.CASHFREE_SECRET_KEY && ENV.CASHFREE_SECRET_KEY.startsWith('test_')
        ? 'https://sandbox.cashfree.com/pg'
        : 'https://api.cashfree.com/pg';

    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + 5); // Allow 5 minutes for the payment link itself to be valid

    const payload = {
        customer_details: {
            customer_phone: customerPhone,
            customer_name: "Customer" // Could be fetched from conversations if available
        },
        link_notify: {
            send_sms: false,
            send_email: false
        },
        link_meta: {
            return_url: ENV.CASHFREE_RETURN_URL.replace('{order_id}', orderId),
            payment_methods: "cc,dc,netbanking,upi"
        },
        link_id: orderId,
        link_amount: amount,
        link_currency: "INR",
        link_purpose: `Payment for ${productName}`,
        link_partial_payments: false,
        link_expiry_time: expireTime.toISOString()
    };

    // Note: To completely test Cashfree, valid App ID/Secret is needed. 
    // This logs a mock link if keys are missing from .env to prevent crashing during Phase 3 local tests.
    if (!ENV.CASHFREE_SECRET_KEY || !ENV.CASHFREE_APP_ID) {
        console.warn('[CASHFREE] Missing valid credentials. Returning mock payment link.');
        return {
            link_id: orderId,
            link_url: `https://mock.cashfree.com/pay/${orderId}`,
            link_status: 'ACTIVE',
            link_expiry_time: expireTime.toISOString()
        };
    }

    const response = await fetch(`${baseUrl}/links`, {
        method: 'POST',
        headers: {
            'x-client-id': ENV.CASHFREE_APP_ID,
            'x-client-secret': ENV.CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cashfree API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    return {
        link_id: data.link_id,
        link_url: data.link_url,
        link_status: data.link_status,
        link_expiry_time: data.link_expiry_time
    };
}

/**
 * Validates the cryptographic signature sent by Cashfree in their webhooks.
 * This ensures attackers cannot forge payment success messages.
 */
export function verifyCashfreeSignature(timestamp: string, rawBody: string, signature: string): boolean {
    if (!ENV.CASHFREE_SECRET_KEY) {
        console.warn('[CASHFREE] Cannot verify signature: No CASHFREE_SECRET_KEY configured.');
        return false;
    }

    const payload = `${timestamp}${rawBody}`;

    const computedSignature = crypto
        .createHmac('sha256', ENV.CASHFREE_SECRET_KEY)
        .update(payload)
        .digest('base64');

    return computedSignature === signature;
}
