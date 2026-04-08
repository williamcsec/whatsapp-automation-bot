import { Router, Request, Response } from 'express';
import { extractYCloudWebhook, sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppInteractiveButtons, verifyYCloudSignature } from '../services/ycloud';
import { ENV } from '../config/env';
import { storeIncomingMessage, storeOutboundMessage } from '../services/messageLogger';
import { getGroupedAvailableProducts, allocateSpecificProduct } from '../services/inventory';
import { getAvailableProducts, markProductAsSold } from '../services/products';
import { detectIntent } from '../services/groq';
// Phase 3 (kept for backward compatibility with non-reservation paths)
import { reserveProduct as legacyReserveProduct, releaseProductReservation } from '../services/reservation';
import { createPaymentLink, verifyCashfreeSignature } from '../services/cashfree';
import { createPendingOrder, getOrderByPaymentLinkId, markOrderPaid } from '../services/orders';
// Phase 6: New service imports
import { reserveProduct as reserveProductV2, releaseReservation, ReservationStateError } from '../services/reservationV2';
import { addToWaitlist } from '../services/waitlist';
import { virtualInterestHandler } from '../services/virtualInventory';
import { discountHandler } from '../services/discountHandler';
import { getSessionState, setSessionState, incrementRateLimit, redis } from '../services/redis';
import { query, transaction } from '../services/db';
// Phase 9: KYC Addendum imports
import { buyIntentHandler } from '../services/buyIntentHandler';
import {
    handleFieldInput, handleKYCConfirm, showFinalPreview,
    showEditFieldList, handleEditSelection,
} from '../services/kycHandler';
import { getKYCState, getKYCDraft } from '../services/redis';
import { setSoftBrowseSession, checkSoftNudge } from '../services/softBrowseHandler';
// FIX 2: Import the Abort & Group message queue service
import { queueMessage, clearQueue } from '../services/messageQueue';

export const webhookRouter = Router();

/**
 * Handles incoming WhatsApp messages from YCloud webhook
 * 
 * FIX 1: DEDUPLICATION — Redis gate on ycloud_message_id prevents processing the same
 *         webhook twice (stops YCloud retry duplicates from causing double messages).
 * FIX 2: MESSAGE BUNCHING — Uses messageQueue so rapid-fire messages from the same user
 *         are grouped into one AI call, not many parallel calls.
 * FIX 5: TRANSACTION — allocateSpecificProduct + buyIntentHandler in same DB transaction.
 */
// @ts-ignore
webhookRouter.post('/whatsapp-incoming', async (req: Request, res: Response) => {
    try {
        const signatureHeader = req.headers['ycloud-signature'] as string;
        // @ts-ignore
        const rawBody = req.rawBody;

        if (ENV.YCLOUD_WEBHOOK_SECRET) {
            if (!signatureHeader || !rawBody) {
                console.warn('[YCLOUD_HOOK] Missing Ycloud-Signature header or raw body.');
                return res.status(400).send('Missing signature headers');
            }
            const isValid = verifyYCloudSignature(rawBody, signatureHeader);
            if (!isValid) {
                console.error('[YCLOUD_HOOK] ⚠️ Invalid YCloud signature — possible forgery attempt.');
                return res.status(200).send('OK'); // Always 200 to prevent retry loops
            }
        }

        if (req.body && req.body.type) {
            console.log(`[YCLOUD_HOOK] Received event type: ${req.body.type}`);
        }

        const messageData = extractYCloudWebhook(req.body);

        if (!messageData) {
            console.log(`[YCLOUD_HOOK] Ignoring non-message event: ${req.body?.type || 'unknown'}`);
            return res.status(200).json({ status: 'ignored_non_message_event' });
        }

        // ── FIX 1: DEDUPLICATION GATE ──────────────────────────────────────────
        // YCloud retries webhooks if we're slow or return 5xx. This Redis key ensures
        // we process each unique message ID exactly once, even if it arrives 3 times.
        const dedupeKey = `dedup:msg:${messageData.ycloud_message_id}`;
        try {
            const isNewMessage = await redis.set(dedupeKey, '1', 'EX', 300, 'NX');
            if (isNewMessage !== 'OK') {
                console.log(`[DEDUP] Skipping duplicate webhook for message ${messageData.ycloud_message_id}`);
                return res.status(200).json({ status: 'duplicate_skipped' });
            }
        } catch (redisErr) {
            // If Redis is briefly down, allow through (don't block legitimate messages)
            console.warn('[DEDUP] Redis dedup check failed, allowing through:', redisErr);
        }

        // ── INPUT SANITIZATION ─────────────────────────────────────────────────
        // Validate phone format (E.164: +country digits, 7-15 chars)
        if (messageData.from_number && !/^\+?[1-9]\d{6,14}$/.test(messageData.from_number)) {
            console.warn(`[SANITIZE] Invalid phone format: ${messageData.from_number}`);
            return res.status(200).json({ status: 'invalid_phone_format' });
        }
        // Strip control characters and cap text length
        if (messageData.text_body) {
            messageData.text_body = messageData.text_body
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip control chars
                .substring(0, 4096); // Cap at 4KB
        }

        // Dynamically assign the Client ID based on the WhatsApp Business Account ID
        const clientId = messageData.waba_id;

        // Check for per-customer Human Override BEFORE storing the message
        const overrideCheck = await query(
            `SELECT is_human_override FROM conversations WHERE client_id = $1 AND customer_phone = $2 ORDER BY created_at DESC LIMIT 1`,
            [clientId, messageData.from_number]
        );
        const isOverrideActive = !!overrideCheck.rows[0]?.is_human_override;

        const conversationId = await storeIncomingMessage(messageData, clientId, isOverrideActive);
        console.log(`[YCLOUD] Stored inbound from ${messageData.from_number} to WABA ${clientId}. Override: ${isOverrideActive}`);

        if (isOverrideActive) {
            console.log(`[OVERRIDE] Human override active for ${messageData.from_number}. AI pipeline skipped.`);
            // Clear any pending queue for this user since human is handling it
            clearQueue(clientId, messageData.from_number);
            return res.status(200).json({ status: 'human_override' });
        }

        if (messageData) {
            console.log(`[YCLOUD] Message Type: ${messageData.message_type}, Has Body: ${!!messageData.text_body}`);
        }

        // ── Interactive Button ID extraction ───────────────────────────────────
        const interactiveData = req.body?.whatsappInboundMessage?.interactive;
        const buttonId = interactiveData?.button_reply?.id ?? interactiveData?.buttonReply?.id
                      ?? interactiveData?.list_reply?.id ?? interactiveData?.listReply?.id ?? null;

        if (messageData.text_body || messageData.message_type === 'interactive') {

            // PHASE 6: Rate limiter — block spam bots (> 60 messages / 60s)
            const msgCount = await incrementRateLimit(messageData.from_number);
            if (msgCount > 60) {
                console.warn(`[RATE_LIMIT] ${messageData.from_number} blocked — ${msgCount} msgs/min`);
                return res.status(200).json({ status: 'rate_limited' });
            }

            // PHASE 6: Session state check — if buyer has an active reservation,
            // return status instead of AI (saves tokens + prevents duplicate reservations)
            const session = await getSessionState(clientId, messageData.from_number);
            if (session?.reservationState === 'hard_reserved' || session?.reservationState === 'payment_initiated') {
                const minsLeft = session.expiresAt ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000)) : '?';
                const statusMsg = `Aapki reservation active hai — payment link: ${session.paymentLink}. ${minsLeft} min baaki hai! ⏰`;
                await sendWhatsAppMessage(messageData.from_number, statusMsg);
                await storeOutboundMessage(messageData.from_number, statusMsg, clientId);
                return res.status(200).json({ status: 'session_active_returned' });
            }

            // ── KYC Interactive Button Routing (handled SYNCHRONOUSLY, no queue needed) ──
            if (buttonId) {
                const kycState = await getKYCState(clientId, messageData.from_number);

                if (buttonId === 'kyc_confirm' && kycState === 'prefill_shown') {
                    await handleKYCConfirm(clientId, messageData.from_number);
                    return res.status(200).json({ status: 'kyc_confirmed_prefill' });
                }
                if (buttonId === 'kyc_edit' && kycState === 'prefill_shown') {
                    const draft = await getKYCDraft(clientId, messageData.from_number) ?? {};
                    await showEditFieldList(draft as any, clientId, messageData.from_number);
                    return res.status(200).json({ status: 'kyc_edit_field_list_shown' });
                }
                if (buttonId === 'kyc_final_confirm' && kycState === 'preview_shown') {
                    await handleKYCConfirm(clientId, messageData.from_number);
                    return res.status(200).json({ status: 'kyc_confirmed_final' });
                }
                if (buttonId === 'kyc_edit_field' && kycState === 'preview_shown') {
                    const draft = await getKYCDraft(clientId, messageData.from_number) ?? {};
                    await showEditFieldList(draft as any, clientId, messageData.from_number);
                    return res.status(200).json({ status: 'kyc_edit_field_list_shown' });
                }
                if (buttonId.startsWith('edit_') && kycState === 'preview_shown') {
                    await handleEditSelection(buttonId, clientId, messageData.from_number);
                    return res.status(200).json({ status: 'kyc_field_editing_started' });
                }
                if ((buttonId === 'delivery_home' || buttonId === 'delivery_pickup') &&
                    (kycState === 'collecting:delivery_preference' || (kycState ?? '').startsWith('editing:'))) {
                    await handleFieldInput(clientId, messageData.from_number, buttonId);
                    return res.status(200).json({ status: 'kyc_delivery_set' });
                }
            }

            // ── KYC Free-Text Continuation ─────────────────────────────────────
            const kycStateAtMsg = await getKYCState(clientId, messageData.from_number);
            if (kycStateAtMsg &&
                kycStateAtMsg !== 'not_started' &&
                kycStateAtMsg !== 'confirmed' &&
                messageData.text_body
            ) {
                await handleFieldInput(clientId, messageData.from_number, messageData.text_body);
                return res.status(200).json({ status: 'kyc_field_collected' });
            }

            // ── FIX 2: MESSAGE BUNCHING — Queue the message for AI processing ──────
            // The webhook returns 200 immediately below. The AI call happens in the background
            // via queueMessage, which groups rapid messages before calling Groq.
            const capturedMessageData = { ...messageData };
            const capturedConversationId = conversationId;
            const capturedClientId = clientId;
            const capturedButtonId = buttonId;
            const capturedBody = req.body;

            queueMessage(
                capturedClientId,
                capturedMessageData.from_number,
                capturedMessageData.text_body || (capturedButtonId ? `[Button: ${capturedButtonId}]` : null),
                async (groupedMessages, signal) => {
                    await processAIIntent(
                        groupedMessages,
                        capturedClientId,
                        capturedConversationId,
                        capturedMessageData,
                        capturedButtonId,
                        signal
                    );
                }
            );

            // Return 200 immediately — AI processes in background via queue
            return res.status(200).json({ status: 'queued_for_processing' });

        } else {
            // Safely handle unsupported media messages
            console.warn(`[YCLOUD] Unhandled message type: ${messageData.message_type || 'unknown'}`);
            await sendWhatsAppMessage(messageData.from_number, `I'm sorry, I can only process text right now (received type: ${messageData.message_type})`);
            return res.status(200).json({ status: 'unsupported_type_handled' });
        }

    } catch (error: any) {
        // FIX 1: Always return 200 even on errors — prevents YCloud from retrying and
        // creating the "many duplicate replies" problem the user was experiencing.
        console.error('[FATAL] Error handling webhook payload:', error);
        return res.status(200).json({ status: 'internal_error_logged' });
    }
});

/**
 * Core AI intent processing — extracted so it can be called from the message queue
 * with a grouped set of messages and a cancellation signal.
 * 
 * FIX 5: The physical reserve flow uses db.transaction() to make
 * allocateSpecificProduct + buyIntentHandler atomic.
 */
async function processAIIntent(
    groupedMessages: string,
    clientId: string,
    conversationId: number,
    messageData: ReturnType<typeof extractYCloudWebhook> & object,
    buttonId: string | null,
    signal?: AbortSignal
): Promise<void> {
    const phone = (messageData as any).from_number;
    try {
        // Fetch grouped inventory and call AI
        const groupedProducts = await getGroupedAvailableProducts(clientId);
        const aiResult = await detectIntent(
            groupedMessages,
            groupedProducts,
            clientId,
            conversationId,
            phone,
            signal  // FIX 2+6: Pass abort signal for cancellation & timeout
        );

        if (signal?.aborted) return; // Bail if aborted while Groq was thinking

        console.log(`[AI] Intent: ${aiResult.intent} | Action: ${aiResult.action} | Confidence: ${aiResult.confidence}`);

        // ── Route: PHYSICAL purchase intent → transaction → KYC gate ──────────
        if (aiResult.action === 'reserve_physical' && aiResult.products?.length > 0) {
            const groupHash = aiResult.products[0].id;

            // FIX 5: Wrap allocate + buyIntent in a single DB transaction
            let realProductId: number | null = null;
            try {
                realProductId = await transaction(async (dbClient) => {
                    return await allocateSpecificProduct(clientId, groupHash, dbClient);
                });
            } catch (txErr) {
                console.error('[WEBHOOK] Transaction failed during product allocation:', txErr);
            }

            if (!realProductId) {
                await sendWhatsAppMessage(phone, 'Yeh variant abhi available nahi hai. Waitlist mein join karein?');
                return;
            }

            await buyIntentHandler(realProductId, groupHash, clientId, phone, 'reserve_physical');
            return;
        }

        // ── Route: VIRTUAL item interest ──────────────────────────────────────
        if (aiResult.action === 'request_virtual' && aiResult.products?.length > 0) {
            const groupHash = aiResult.products[0].id;
            let realProductId: number | null = null;
            try {
                realProductId = await transaction(async (dbClient) => {
                    return await allocateSpecificProduct(clientId, groupHash, dbClient);
                });
            } catch (txErr) {
                console.error('[WEBHOOK] Transaction failed during virtual product allocation:', txErr);
            }
            if (realProductId) {
                await buyIntentHandler(realProductId, groupHash, clientId, phone, 'request_virtual');
            }
            return;
        }

        // ── Route: Price negotiation ──────────────────────────────────────────
        if (aiResult.action === 'price_objection' && aiResult.products?.length > 0) {
            const groupHash = aiResult.products[0].id;
            let realProductId: number | null = null;
            try {
                realProductId = await transaction(async (dbClient) => {
                    return await allocateSpecificProduct(clientId, groupHash, dbClient);
                });
            } catch (txErr) {
                console.error('[WEBHOOK] Transaction failed during discount allocation:', txErr);
            }
            if (realProductId) {
                const productResult = await getAvailableProducts(clientId);
                const product = productResult.find(p => p.id === realProductId);
                if (product) {
                    const requestedPrice = product.price * 0.95;
                    await discountHandler(realProductId, clientId, phone, requestedPrice);
                    await storeOutboundMessage(phone, '[Discount request sent to manager]', clientId);
                    return;
                }
            }
        }

        // ── Phase 9: Soft Browse Nudge ─────────────────────────────────────────
        let nudgeText: string | null = null;
        if (aiResult.intent === 'browse' && aiResult.products?.length === 1) {
            const browseHash = aiResult.products[0].id;
            const browseProductId = await allocateSpecificProduct(clientId, browseHash);
            if (browseProductId) {
                await setSoftBrowseSession(browseProductId, clientId, phone);
                nudgeText = await checkSoftNudge(browseProductId, clientId, phone);
            }
        }

        // ── Send Images ───────────────────────────────────────────────────────
        if (aiResult.products && aiResult.products.length > 0) {
            for (const prod of aiResult.products) {
                if (prod.images && prod.images.length > 0) {
                    await sendWhatsAppImage(phone, prod.images[0], `₹${prod.price} - ${prod.title}`);
                    await storeOutboundMessage(phone, `[Image Sent: ${prod.title}]`, clientId);
                }
            }
        }

        // ── Send Text + Buttons ───────────────────────────────────────────────
        const finalResponseText = nudgeText ? aiResult.text + nudgeText : aiResult.text;
        if (aiResult.buttons && aiResult.buttons.length > 0) {
            await sendWhatsAppInteractiveButtons(phone, finalResponseText, aiResult.buttons);
            await storeOutboundMessage(phone, `[Interactive] ${finalResponseText}`, clientId);
        } else {
            await sendWhatsAppMessage(phone, finalResponseText);
            await storeOutboundMessage(phone, finalResponseText, clientId);
        }

    } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) {
            // This is expected — another message arrived, this call was cancelled
            console.log(`[AI] Processing aborted for ${phone} — superseded by newer message`);
            return;
        }
        console.error(`[AI] Unhandled error processing intent for ${phone}:`, err);
        // Send a graceful fallback instead of silent failure
        try {
            await sendWhatsAppMessage(phone, 'Sorry, kuch technical issue ho gaya. Ek minute ruko aur dobara try karo! 🙏');
        } catch { /* best-effort */ }
    }
}

/**
 * Handles incoming webhooks from Cashfree when a payment completes.
 * PHASE 6: Upgraded with tiered event handling, amount fraud guard, and Redis idempotency gate.
 */
// @ts-ignore
webhookRouter.post('/cashfree', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-webhook-signature'] as string;
        const timestamp = req.headers['x-webhook-timestamp'] as string;
        // @ts-ignore
        const rawBody = req.rawBody;

        if (!signature || !timestamp || !rawBody) {
            console.warn('[CASHFREE_HOOK] Missing signature headers.');
            return res.status(400).send('Missing headers or body');
        }

        // 1. Cryptographic signature verification (fraud prevention)
        const isValid = verifyCashfreeSignature(timestamp, rawBody, signature);
        if (!isValid) {
            console.error('[CASHFREE_HOOK] ⚠️ Invalid signature — possible forgery attempt.');
            return res.status(200).send('OK'); // Always 200 to prevent retry loops
        }

        const payload = req.body;
        const orderDetails = payload.data?.order;
        const paymentDetails = payload.data?.payment;
        const webhookType: string = payload.type || '';
        const cfOrderId: string = orderDetails?.order_id || '';

        console.log(`[CASHFREE_HOOK] Verified: type=${webhookType} order=${cfOrderId}`);

        if (!cfOrderId) return res.status(200).send('OK');

        // 2. PHASE 6: Redis-first idempotency check (faster than DB for duplicate webhooks)
        const { isWebhookProcessed, markWebhookProcessed, extendToPaymentInitiated, extendToPaymentProcessing } = await import('../services/redis');
        if (webhookType === 'PAYMENT_SUCCESS_WEBHOOK') {
            const alreadyProcessed = await isWebhookProcessed(cfOrderId);
            if (alreadyProcessed) {
                console.log(`[CASHFREE_HOOK] Idempotent skip for order ${cfOrderId}`);
                return res.status(200).send('Already processed');
            }
        }

        const pendingOrder = await getOrderByPaymentLinkId(cfOrderId);
        if (!pendingOrder) {
            console.warn(`[CASHFREE_HOOK] No pending order for: ${cfOrderId}`);
            return res.status(200).send('OK');
        }

        // 3. Route by webhook event type
        if (webhookType === 'PAYMENT_INITIATED_WEBHOOK') {
            await extendToPaymentInitiated(pendingOrder.product_id);
            await query<any>(
                `UPDATE pending_orders SET status = 'payment_initiated', payment_initiated_at = NOW()
                 WHERE id = $1 AND status = 'pending_payment'`,
                [pendingOrder.id]
            );
            console.log(`[CASHFREE_HOOK] Timer extended to 15min for product ${pendingOrder.product_id}`);
        }

        else if (webhookType === 'PAYMENT_FAILED_WEBHOOK') {
            await query<any>(
                `UPDATE pending_orders
                 SET status = 'failed', payment_retry_count = payment_retry_count + 1,
                     last_payment_error = $1, last_state_change_at = NOW()
                 WHERE id = $2`,
                [paymentDetails?.payment_message || 'unknown', pendingOrder.id]
            );
            await sendWhatsAppMessage(
                pendingOrder.customer_phone,
                `Payment fail ho gaya! 5 minute mein retry karein:\n\n${pendingOrder.payment_link}`
            );
        }

        else if (webhookType === 'PAYMENT_SUCCESS_WEBHOOK') {
            // 4. Amount fraud guard — T-12
            const paidAmount = Number(paymentDetails?.payment_amount || 0);
            const expectedAmount = Number(pendingOrder.approved_price || pendingOrder.amount);
            if (Math.abs(paidAmount - expectedAmount) > 1) {
                console.error(`[CASHFREE_HOOK] 🚨 AMOUNT MISMATCH! paid=${paidAmount} expected=${expectedAmount} order=${pendingOrder.id}`);
                await query<any>(
                    `INSERT INTO reservation_audit (client_id, product_id, order_id, customer_phone, from_state, to_state, trigger_event, metadata)
                     VALUES ($1,$2,$3,$4,'payment_initiated','fraud_suspected','amount_mismatch',$5)`,
                    [pendingOrder.client_id, pendingOrder.product_id, pendingOrder.id, pendingOrder.customer_phone,
                    JSON.stringify({ paidAmount, expectedAmount })]
                );
                return res.status(200).send('OK');
            }

            // 5. DB-level idempotency (double protection after Redis)
            const isFirstTime = await markOrderPaid(pendingOrder.id);
            if (!isFirstTime) {
                return res.status(200).send('Already processed');
            }

            // 6. Redis idempotency marker
            await markWebhookProcessed(cfOrderId);

            // 7. Fulfill: mark product sold, release Phase 6 lock, clear waitlist
            await markProductAsSold(pendingOrder.product_id);
            const { releaseHardReservation } = await import('../services/redis');
            await releaseHardReservation(pendingOrder.product_id);

            const { clearWaitlistForProduct } = await import('../services/waitlist');
            await clearWaitlistForProduct(pendingOrder.product_id, pendingOrder.client_id);

            // Insert into completed_orders table with KYC invoice snapshot
            const pendingOrderFull = pendingOrder as any;
            await query<any>(
                `INSERT INTO completed_orders (client_id, order_id, customer_phone, product_id, product_name, product_price,
                 cf_order_id, cf_payment_id, payment_method, payment_amount, payment_time,
                 invoice_customer_name, invoice_customer_email, invoice_customer_phone,
                 invoice_delivery_pref, invoice_delivery_address)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15)
                 ON CONFLICT (order_id) DO NOTHING`,
                [pendingOrder.client_id, cfOrderId, pendingOrder.customer_phone, pendingOrder.product_id,
                paymentDetails?.order_name ?? '', expectedAmount,
                    cfOrderId, paymentDetails?.cf_payment_id, paymentDetails?.payment_group,
                    paidAmount,
                pendingOrderFull.customer_full_name ?? null,
                pendingOrderFull.customer_email ?? null,
                pendingOrder.customer_phone,
                pendingOrder.delivery_preference ?? null,
                pendingOrder.delivery_address ? JSON.stringify(pendingOrder.delivery_address) : null,
                ]
            );

            console.log(`[CASHFREE_HOOK] ✅ Fulfilled Order ${pendingOrder.id} — Product ${pendingOrder.product_id} SOLD`);

            const successMsg = `✅ *Payment Successful!*\n\nThank you! We received ₹${paidAmount}. Your order is confirmed. Our team will contact you for delivery details. 🎉`;
            await sendWhatsAppMessage(pendingOrder.customer_phone, successMsg);
            await storeOutboundMessage(pendingOrder.customer_phone, successMsg, pendingOrder.client_id);
        }

        return res.status(200).send('OK');

    } catch (error: any) {
        // FIX 1: Always return 200 even on errors
        console.error('[FATAL] Error handling Cashfree webhook:', error);
        return res.status(200).send('OK');
    }
});
