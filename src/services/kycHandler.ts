/**
 * kycHandler.ts — KYC Collection State Machine
 *
 * Handles the full multi-step KYC flow:
 * - startFreshCollection() — begins field-by-field collection
 * - collectNextField() — asks for the next unanswered field
 * - handleFieldInput() — validates and stores a field response
 * - showFinalPreview() — shows formatted preview before confirmation
 * - showEditFieldList() — lets customer pick a field to edit
 * - handleEditSelection() — routes to re-ask a specific field
 * - handleKYCConfirm() — saves to DB, triggers reserveProductV2()
 *
 * Per KYC Addendum Section 6.
 */
import { query } from './db';
import { sendWhatsAppMessage, sendWhatsAppInteractiveButtons } from './ycloud';
import {
    getKYCDraft, setKYCDraft, getKYCState, setKYCState, clearKYCKeys,
    getProductIntent, KYCDraft,
} from './redis';
import { validateField, normaliseFieldValue, KYCField, MAX_FIELD_RETRIES } from './fieldValidator';
import { encryptAadhaar, maskAadhaarLast4, AadhaarEncrypted } from './aadhaarCrypto';
import { reserveProduct as reserveProductV2 } from './reservationV2';
import { virtualInterestHandler } from './virtualInventory';
import { sendWhatsAppInteractiveList } from './ycloud';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CustomerDetailsRow {
    id: number;
    client_id: string;
    phone: string;
    full_name: string;
    email: string | null;
    aadhaar_encrypted: string | null;
    aadhaar_iv: string | null;
    aadhaar_tag: string | null;
    delivery_preference: string;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
}

// ─── Collection sequence: field names in order ─────────────────────────────

const COLLECTION_SEQUENCE: KYCField[] = [
    'full_name',
    'email',
    'delivery_preference',
    // address fields added dynamically if delivery_preference === 'delivery'
    'aadhaar',
];

const ADDRESS_FIELDS: KYCField[] = ['address_line1', 'address_line2', 'city', 'state', 'pincode'];

function buildSequence(draft: KYCDraft): KYCField[] {
    const seq: KYCField[] = ['full_name', 'email', 'delivery_preference'];
    if (draft.delivery_preference === 'delivery') {
        seq.push(...ADDRESS_FIELDS);
    }
    seq.push('aadhaar');
    return seq;
}

// ─── Field prompts ──────────────────────────────────────────────────────────

const FIELD_PROMPTS: Partial<Record<KYCField, string>> = {
    full_name: '📝 Pehle aapka poora naam batao (as on Aadhaar):',
    email: "📧 Aapki email ID kya hai? (receipt ke liye)\n(ya 'skip' bhejo if you want to skip)",
    address_line1: '🏠 Ghar/flat number aur society/building name batao:',
    address_line2: "📍 Area/colony name (optional — 'skip' bhej sakte ho):",
    city: '🌆 City ka naam?',
    state: '🗺️ State ka naam?',
    pincode: '📮 Pincode kya hai? (6 digits)',
    aadhaar: '🪪 Last step — Aadhaar number batao (12 digits). Yeh encrypted store hoga, safe hai:',
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Begins fresh KYC collection from Step 1.
 * Called when no existing customer_details record exists.
 */
export async function startFreshCollection(clientId: string, phone: string): Promise<void> {
    await setKYCState(clientId, phone, 'collecting:full_name');
    const draft: KYCDraft = {};
    await setKYCDraft(clientId, phone, draft);
    await sendWhatsAppMessage(phone, FIELD_PROMPTS.full_name!);
}

/**
 * Shows existing customer details for confirmation (pre-fill path).
 * Called when customer_details row exists.
 */
export async function showPrefillConfirmation(details: CustomerDetailsRow, clientId: string, phone: string): Promise<void> {
    await setKYCState(clientId, phone, 'prefill_shown');
    const previewText = formatDetailsPreview(details);
    await sendWhatsAppInteractiveButtons(phone,
        `Aapki saved details:\n\n${previewText}\n\nKya yeh details sahi hain?`,
        [
            { id: 'kyc_confirm', title: '✅ Confirm & Proceed' },
            { id: 'kyc_edit', title: '✏️ Edit Details' },
        ]
    );
}

/**
 * Handles a free-text message OR button tap during KYC collection.
 * Routes based on current KYC state.
 */
export async function handleFieldInput(clientId: string, phone: string, input: string): Promise<void> {
    const state = await getKYCState(clientId, phone);
    if (!state || state === 'not_started') {
        // Shouldn't reach here, but gracefully restart
        await startFreshCollection(clientId, phone);
        return;
    }

    if (state.startsWith('collecting:')) {
        const field = state.replace('collecting:', '') as KYCField;
        await processCollectionInput(clientId, phone, field, input);
        return;
    }

    if (state.startsWith('editing:')) {
        const field = state.replace('editing:', '') as KYCField;
        await processCollectionInput(clientId, phone, field, input, true);
        return;
    }

    if (state === 'prefill_shown') {
        // Customer sent free text while prefill was shown — re-send the buttons
        const details = await fetchCustomerDetails(clientId, phone);
        if (details) await showPrefillConfirmation(details, clientId, phone);
        return;
    }

    if (state === 'preview_shown') {
        // Customer sent free text while preview was shown — re-send the preview buttons
        const draft = await getKYCDraft(clientId, phone);
        if (draft) await showFinalPreview(draft, clientId, phone);
        return;
    }
}

/**
 * Validates and stores a single field answer, then advances to the next step.
 */
async function processCollectionInput(
    clientId: string,
    phone: string,
    field: KYCField,
    input: string,
    isEditing = false
): Promise<void> {
    const draft = (await getKYCDraft(clientId, phone)) ?? {};

    // Delivery preference must be a button tap
    if (field === 'delivery_preference') {
        if (!['delivery_home', 'delivery_pickup'].includes(input.trim())) {
            // Re-send the buttons; ignore free text
            await sendWhatsAppInteractiveButtons(phone,
                '🚚 Delivery preference choose karo:',
                [
                    { id: 'delivery_home', title: '📦 Home Delivery' },
                    { id: 'delivery_pickup', title: '🏪 Store Pickup' },
                ]
            );
            return;
        }
    }

    const error = validateField(field, input);
    if (error) {
        // Track retries
        const retryCounts = draft.retry_counts ?? {};
        retryCounts[field] = (retryCounts[field] ?? 0) + 1;
        draft.retry_counts = retryCounts;
        await setKYCDraft(clientId, phone, draft);

        if (retryCounts[field] >= MAX_FIELD_RETRIES) {
            await sendWhatsAppMessage(phone,
                '❌ 3 baar fail ho gaya. Collection restart ho raha hai. Dobara try karo.'
            );
            await setKYCState(clientId, phone, 'not_started');
            await startFreshCollection(clientId, phone);
            return;
        }

        await sendWhatsAppMessage(phone, error);
        return;
    }

    // Reset retry count on success
    if (draft.retry_counts) {
        delete draft.retry_counts[field];
    }

    // Normalise the value (IMPORTANT: aadhaar raw goes into draft TEMPORARILY)
    const normalised = normaliseFieldValue(field, input);

    if (field === 'aadhaar') {
        // Store TEMPORARILY — will be deleted immediately in handleKYCConfirm()
        // Never log normalised value here
        draft.aadhaar_raw_temp = normalised ?? undefined;
    } else if (field === 'delivery_preference') {
        draft.delivery_preference = (normalised as 'delivery' | 'pickup') ?? 'pickup';
    } else {
        (draft as any)[field] = normalised;
    }

    await setKYCDraft(clientId, phone, draft);

    if (isEditing) {
        // Return to preview after editing a field
        await showFinalPreview(draft, clientId, phone);
        return;
    }

    // Advance to next field in sequence
    const sequence = buildSequence(draft);
    const currentIndex = sequence.indexOf(field);
    const nextField = sequence[currentIndex + 1];

    if (field === 'delivery_preference' && draft.delivery_preference !== 'delivery') {
        // Skip all address fields — jump straight to Aadhaar
        await setKYCState(clientId, phone, 'collecting:aadhaar');
        await sendWhatsAppMessage(phone, FIELD_PROMPTS.aadhaar!);
        return;
    }

    if (nextField) {
        await setKYCState(clientId, phone, `collecting:${nextField}`);

        if (nextField === 'delivery_preference') {
            // Use interactive buttons for delivery type
            await sendWhatsAppInteractiveButtons(phone,
                '🚚 Delivery preference choose karo:',
                [
                    { id: 'delivery_home', title: '📦 Home Delivery' },
                    { id: 'delivery_pickup', title: '🏪 Store Pickup' },
                ]
            );
        } else {
            await sendWhatsAppMessage(phone, FIELD_PROMPTS[nextField]!);
        }
    } else {
        // All fields collected — show final preview
        await showFinalPreview(draft, clientId, phone);
    }
}

/**
 * Shows the formatted final preview before confirmation.
 */
export async function showFinalPreview(draft: KYCDraft, clientId: string, phone: string): Promise<void> {
    await setKYCState(clientId, phone, 'preview_shown');

    const lines = [
        '📋 *Aapki details — ek baar check karo:*',
        '',
        `👤 Naam:     ${draft.full_name}`,
        `📱 Phone:    ${phone}`,
        `📧 Email:    ${draft.email ?? '—'}`,
        `🚚 Delivery: ${draft.delivery_preference === 'delivery' ? 'Home Delivery' : 'Store Pickup'}`,
    ];

    if (draft.delivery_preference === 'delivery') {
        lines.push(`📍 Address:  ${draft.address_line1}`);
        if (draft.address_line2) lines.push(`            ${draft.address_line2}`);
        lines.push(`            ${draft.city}, ${draft.state} — ${draft.pincode}`);
    }

    const aadhaarSuffix = draft.aadhaar_raw_temp?.slice(-4) ?? '****';
    lines.push(`🪪 Aadhaar:  ****-****-${aadhaarSuffix}`);
    lines.push('');
    lines.push('Sab sahi hai toh Confirm karo. Kuch edit karna hai?');

    await sendWhatsAppInteractiveButtons(phone, lines.join('\n'), [
        { id: 'kyc_final_confirm', title: '✅ Confirm & Buy' },
        { id: 'kyc_edit_field', title: '✏️ Edit a Field' },
    ]);
}

/**
 * Shows a list of fields for the customer to edit.
 */
export async function showEditFieldList(draft: KYCDraft, clientId: string, phone: string): Promise<void> {
    await setKYCState(clientId, phone, 'preview_shown');

    const rows: { id: string; title: string; description: string }[] = [
        { id: 'edit_full_name', title: '👤 Full Name', description: draft.full_name ?? '' },
        { id: 'edit_email', title: '📧 Email', description: draft.email ?? 'Not set' },
        { id: 'edit_delivery', title: '🚚 Delivery Type', description: draft.delivery_preference === 'delivery' ? 'Home Delivery' : 'Store Pickup' },
    ];

    if (draft.delivery_preference === 'delivery') {
        rows.push({ id: 'edit_address', title: '📍 Full Address', description: `${draft.address_line1}, ${draft.city}` });
        rows.push({ id: 'edit_pincode', title: '📮 Pincode', description: draft.pincode ?? '' });
    }

    const aadhaarSuffix = draft.aadhaar_raw_temp?.slice(-4) ?? '****';
    rows.push({ id: 'edit_aadhaar', title: '🪪 Aadhaar Number', description: `****-****-${aadhaarSuffix}` });

    await sendWhatsAppInteractiveList(phone, {
        body: 'Kaunsa field change karna chahte ho?',
        button: 'Field Chunno',
        sections: [{ title: 'Kaunsa field edit karna hai?', rows }],
    });
}

/**
 * When customer taps a row in the edit field list.
 */
export async function handleEditSelection(fieldId: string, clientId: string, phone: string): Promise<void> {
    const fieldMap: Record<string, { field: KYCField; prompt: string | null }> = {
        edit_full_name: { field: 'full_name', prompt: 'Naya poora naam batao:' },
        edit_email: { field: 'email', prompt: "Naya email batao (ya 'skip' likho):" },
        edit_delivery: { field: 'delivery_preference', prompt: null },  // interactive buttons
        edit_address: { field: 'address_line1', prompt: 'Poora address dobara likho (line 1):' },
        edit_pincode: { field: 'pincode', prompt: 'Naya pincode batao (6 digits):' },
        edit_aadhaar: { field: 'aadhaar', prompt: 'Aadhaar number dobara bhejo (12 digits):' },
    };

    const target = fieldMap[fieldId];
    if (!target) return;

    await setKYCState(clientId, phone, `editing:${target.field}`);

    if (target.field === 'delivery_preference') {
        await sendWhatsAppInteractiveButtons(phone, 'Delivery preference change karo:', [
            { id: 'delivery_home', title: '📦 Home Delivery' },
            { id: 'delivery_pickup', title: '🏪 Store Pickup' },
        ]);
    } else {
        await sendWhatsAppMessage(phone, target.prompt!);
    }
}

/**
 * Final step: called when customer taps "Confirm & Buy".
 * 1. Encrypts Aadhaar immediately, deletes plaintext from draft
 * 2. Upserts customer_details to DB
 * 3. Sets KYC state to 'confirmed'
 * 4. Retrieves product intent and triggers reservation
 */
export async function handleKYCConfirm(clientId: string, phone: string): Promise<void> {
    const draft = await getKYCDraft(clientId, phone);
    if (!draft) {
        await sendWhatsAppMessage(phone, 'Session expire ho gayi. Please dobara try karein.');
        return;
    }

    // ── Step 1: Encrypt Aadhaar then DELETE plaintext immediately ─────────
    let aadhaarEncrypted: AadhaarEncrypted | null = null;
    if (draft.aadhaar_raw_temp) {
        try {
            aadhaarEncrypted = encryptAadhaar(draft.aadhaar_raw_temp);
        } catch {
            await sendWhatsAppMessage(phone, 'Aadhaar format sahi nahi laga. Please restart karein.');
            return;
        }
        // IMMEDIATELY delete plaintext — does not leave memory without being encrypted
        delete draft.aadhaar_raw_temp;
        await setKYCDraft(clientId, phone, draft);
    }

    // ── Step 2: Upsert customer_details ───────────────────────────────────
    const deliveryAddress = draft.delivery_preference === 'delivery' ? {
        line1: draft.address_line1,
        line2: draft.address_line2 ?? null,
        city: draft.city,
        state: draft.state,
        pincode: draft.pincode,
    } : null;

    const upsertResult = await query(
        `INSERT INTO customer_details
            (client_id, phone, full_name, email,
             aadhaar_encrypted, aadhaar_iv, aadhaar_tag,
             delivery_preference, address_line1, address_line2,
             city, state, pincode, details_confirmed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
         ON CONFLICT (client_id, phone) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             email = EXCLUDED.email,
             aadhaar_encrypted = COALESCE(EXCLUDED.aadhaar_encrypted, customer_details.aadhaar_encrypted),
             aadhaar_iv = COALESCE(EXCLUDED.aadhaar_iv, customer_details.aadhaar_iv),
             aadhaar_tag = COALESCE(EXCLUDED.aadhaar_tag, customer_details.aadhaar_tag),
             delivery_preference = EXCLUDED.delivery_preference,
             address_line1 = EXCLUDED.address_line1,
             address_line2 = EXCLUDED.address_line2,
             city = EXCLUDED.city,
             state = EXCLUDED.state,
             pincode = EXCLUDED.pincode,
             details_confirmed_at = NOW(),
             updated_at = NOW()
         RETURNING id, full_name`,
        [
            clientId, phone, draft.full_name, draft.email ?? null,
            aadhaarEncrypted?.encrypted ?? null,
            aadhaarEncrypted?.iv ?? null,
            aadhaarEncrypted?.tag ?? null,
            draft.delivery_preference ?? 'pickup',
            draft.address_line1 ?? null, draft.address_line2 ?? null,
            draft.city ?? null, draft.state ?? null, draft.pincode ?? null,
        ]
    );

    const savedDetails = upsertResult.rows[0];
    if (!savedDetails) {
        await sendWhatsAppMessage(phone, 'Details save mein error aaya. Please dobara try karein.');
        return;
    }

    // ── Step 3: Mark KYC confirmed in Redis (20 min TTL) ─────────────────
    await setKYCState(clientId, phone, 'confirmed', 1200);

    // ── Step 4: Get product intent ────────────────────────────────────────
    const intent = await getProductIntent(clientId, phone);
    if (!intent) {
        await sendWhatsAppMessage(phone,
            'Details save ho gayi! ✅\n\nPar product session expire ho gaya. Dobara product choose karein.'
        );
        return;
    }

    // ── Step 5: Clean up KYC Redis keys (keep :state as 'confirmed') ─────
    await clearKYCKeys(clientId, phone);

    // ── Step 6: Trigger the appropriate reservation flow ──────────────────
    if (intent.intendedAction === 'reserve_physical') {
        const result = await reserveProductV2(
            intent.productId, clientId, phone,
            intent.hashId,
            savedDetails.id,          // customerDetailsId
            deliveryAddress,           // snapshot for invoice
        );
        await sendWhatsAppMessage(phone, result.message);
    } else if (intent.intendedAction === 'request_virtual') {
        await virtualInterestHandler(intent.productId, clientId, phone);
    }
}

// ─── Private helpers ───────────────────────────────────────────────────────

function formatDetailsPreview(d: CustomerDetailsRow): string {
    const lines = [
        `👤 Name:     ${d.full_name}`,
        `📱 Phone:    ${d.phone}`,
        `📧 Email:    ${d.email ?? '—'}`,
        `🚚 Delivery: ${d.delivery_preference === 'delivery' ? 'Home Delivery' : 'Store Pickup'}`,
    ];
    if (d.delivery_preference === 'delivery' && d.address_line1) {
        lines.push(`📍 Address:  ${d.address_line1}, ${d.city} - ${d.pincode}`);
    }
    // Aadhaar: decrypt ONLY last 4 for display
    if (d.aadhaar_encrypted && d.aadhaar_iv && d.aadhaar_tag) {
        const last4 = maskAadhaarLast4({
            encrypted: d.aadhaar_encrypted,
            iv: d.aadhaar_iv,
            tag: d.aadhaar_tag,
        });
        lines.push(`🪪 Aadhaar:  ****-****-${last4}  (stored securely)`);
    }
    return lines.join('\n');
}

async function fetchCustomerDetails(clientId: string, phone: string): Promise<CustomerDetailsRow | null> {
    const result = await query(
        `SELECT * FROM customer_details WHERE client_id = $1 AND phone = $2`,
        [clientId, phone]
    );
    return result.rows[0] ?? null;
}
