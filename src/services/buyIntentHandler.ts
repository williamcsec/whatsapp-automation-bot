/**
 * buyIntentHandler.ts — Reservation Entry Point Gate
 *
 * Called from webhookRouter when AI action === "reserve_physical" or "request_virtual".
 * NEVER calls reserveProductV2() directly — that only happens in handleKYCConfirm().
 *
 * Flow:
 *  1. Save the product intent in Redis (30-min TTL)
 *  2. Check if KYC is already confirmed (20-min TTL window)
 *  3a. Confirmed → call reserveProductV2() immediately
 *  3b. Existing details → show prefill confirmation
 *  3c. New customer → start fresh collection from Step 1
 *
 * Per KYC Addendum Section 6.1 and Section 12 Rule 8.
 */
import { query } from './db';
import { setProductIntent, getKYCState, ProductIntent } from './redis';
import { sendWhatsAppMessage } from './ycloud';
import { showPrefillConfirmation, startFreshCollection, handleKYCConfirm } from './kycHandler';
import { reserveProduct as reserveProductV2 } from './reservationV2';
import { virtualInterestHandler } from './virtualInventory';

/**
 * Main entry point for all purchase intents (physical or virtual).
 * Replaces the direct reserveProductV2() call in webhookRouter.
 */
export async function buyIntentHandler(
    productId: number,
    hashId: string,
    clientId: string,
    phone: string,
    intendedAction: 'reserve_physical' | 'request_virtual'
): Promise<void> {
    // ── Step 1: Save product intent (survives 30 min of KYC collection) ──
    const intent: ProductIntent = { productId, hashId, clientId, intendedAction };
    await setProductIntent(clientId, phone, intent);

    // ── Step 2: Is KYC already confirmed for this customer? ───────────────
    const kycState = await getKYCState(clientId, phone);

    if (kycState === 'confirmed') {
        // Customer confirmed KYC recently (within 20-min window)
        // Trigger reservation directly — no re-collection needed
        console.log(`[KYC] State confirmed for ${phone} — proceeding directly to reservation`);
        await handleKYCConfirm(clientId, phone);
        return;
    }

    // ── Step 3: Look up existing customer_details ─────────────────────────
    const existing = await query(
        `SELECT * FROM customer_details WHERE client_id = $1 AND phone = $2`,
        [clientId, phone]
    );

    if (existing.rows.length > 0) {
        // Pre-fill path — show details for confirmation
        console.log(`[KYC] Existing details found for ${phone} — showing prefill`);
        await showPrefillConfirmation(existing.rows[0], clientId, phone);
    } else {
        // New customer — begin step-by-step collection
        console.log(`[KYC] No existing details for ${phone} — starting fresh collection`);
        await startFreshCollection(clientId, phone);
    }
}
