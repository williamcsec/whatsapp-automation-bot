import crypto from 'crypto';
import { ENV } from '../config/env';

export interface YCloudWebhookPayload {
    id: string;
    type: string;
    apiVersion: string;
    createTime: string;
    whatsappInboundMessage?: {
        id: string; // The wamid.xxxxx
        wabaId: string;
        phoneNumber: string;
        from: string; // Customer phone
        type: 'text' | 'image' | 'video' | 'interactive' | string;
        timestamp: string;
        text?: { body: string };
        image?: { id: string, mimeType: string, caption?: string };
        interactive?: {
            type: 'button_reply' | 'list_reply';
            // YCloud sends snake_case keys in actual webhooks
            button_reply?: { id: string, title: string };
            list_reply?: { id: string, title: string, description?: string };
            // Some SDKs may use camelCase
            buttonReply?: { id: string, title: string };
            listReply?: { id: string, title: string, description?: string };
        };
        context?: { from: string, id: string };
    };
    whatsappMessage?: {
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        error?: { code: number, title: string, message: string };
    };
}

export interface ExtractedWebhookData {
    ycloud_event_id: string;
    ycloud_message_id: string;
    waba_id: string;
    from_number: string;
    message_type: string;
    text_body: string | null;
    ycloud_timestamp: string;
}

/**
 * Validates and extracts the raw payload from YCloud Webhook 
 */
export function extractYCloudWebhook(body: YCloudWebhookPayload): ExtractedWebhookData | null {
    // If it's a status update, we ignore it for the "incoming message" processor 
    // (we'd route it differently if needed)
    if (!body?.whatsappInboundMessage) {
        return null;
    }

    const msg = body.whatsappInboundMessage;
    let textBody = msg.text?.body || null;

    // Handle interactive button or list replies
    // YCloud sends snake_case (button_reply) in actual payloads, support both formats
    if (msg.type === 'interactive' && msg.interactive) {
        const btnReply = msg.interactive.button_reply || msg.interactive.buttonReply;
        const lstReply = msg.interactive.list_reply || msg.interactive.listReply;
        if (msg.interactive.type === 'button_reply' && btnReply) {
            textBody = btnReply.title;
            console.log(`[YCLOUD] Extracted button reply: id=${btnReply.id}, title=${btnReply.title}`);
        } else if (msg.interactive.type === 'list_reply' && lstReply) {
            textBody = lstReply.title;
            console.log(`[YCLOUD] Extracted list reply: id=${lstReply.id}, title=${lstReply.title}`);
        }
    }

    return {
        ycloud_event_id: body.id,
        ycloud_message_id: msg.id,
        waba_id: msg.wabaId,
        from_number: msg.from,
        message_type: msg.type,
        text_body: textBody,
        ycloud_timestamp: msg.timestamp
    };
}

/**
 * Sends a standard text message back to the customer via YCloud.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<any> {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
    const payload = {
        from: ENV.WHATSAPP_BUSINESS_PHONE,
        to: to,
        type: 'text',
        text: { body: text }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENV.YCLOUD_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errPayload = await response.text();
        throw new Error(`YCloud API Error [${response.status}]: ${errPayload}`);
    }

    return await response.json();
}

/**
 * Sends a standalone image via YCloud (Phase 2 safe media handling).
 */
export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<any> {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
    const payload = {
        from: ENV.WHATSAPP_BUSINESS_PHONE,
        to: to,
        type: 'image',
        image: {
            link: imageUrl,
            caption: caption || ''
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENV.YCLOUD_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errPayload = await response.text();
        throw new Error(`YCloud API Error [${response.status}]: ${errPayload}`);
    }

    return await response.json();
}

/**
 * Sends Interactive Buttons via WhatsApp. Great for yes/no, pay/cancel flows.
 * WhatsApp allows a maximum of 3 buttons per message.
 */
export async function sendWhatsAppInteractiveButtons(to: string, text: string, buttons: { id: string, title: string }[]): Promise<any> {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';

    // WhatsApp hard limit is 3 buttons.
    const safeButtons = buttons.slice(0, 3).map(btn => ({
        type: 'reply',
        reply: {
            id: btn.id.substring(0, 256), // Max 256 chars
            title: btn.title.substring(0, 20) // Max 20 chars per WA specs
        }
    }));

    const payload = {
        from: ENV.WHATSAPP_BUSINESS_PHONE,
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: text },
            action: {
                buttons: safeButtons
            }
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENV.YCLOUD_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errPayload = await response.text();
        throw new Error(`YCloud API Error [${response.status}]: ${errPayload}`);
    }

    return await response.json();
}

/**
 * Sends an interactive List Message via YCloud (for KYC field selection).
 * Supports up to 10 rows per section (well within our field count).
 * Per KYC Addendum Section 6.5.
 */
export interface InteractiveListSection {
    title: string;
    rows: { id: string; title: string; description?: string }[];
}

export async function sendWhatsAppInteractiveList(
    to: string,
    options: { body: string; button: string; sections: InteractiveListSection[]; footer?: string }
): Promise<any> {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';

    const payload = {
        from: ENV.WHATSAPP_BUSINESS_PHONE,
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: options.body },
            footer: options.footer ? { text: options.footer } : undefined,
            action: {
                button: options.button,
                sections: options.sections.map(s => ({
                    title: s.title,
                    rows: s.rows.map(r => ({
                        id: r.id.substring(0, 200),
                        title: r.title.substring(0, 24),
                        description: r.description?.substring(0, 72),
                    })),
                })),
            },
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENV.YCLOUD_API_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errPayload = await response.text();
        throw new Error(`YCloud API Error (List) [${response.status}]: ${errPayload}`);
    }

    return await response.json();
}

/**
 * Validates the cryptographic signature sent by YCloud in their webhooks.
 * Prevents attackers from forging incoming WhatsApp messages.
 * Header format: "t=1773843508,s=9abd664d9310..."
 * Payload signed: "{timestamp}.{request_body}"
 */
export function verifyYCloudSignature(rawBody: string, signatureHeader: string): boolean {
    if (!ENV.YCLOUD_WEBHOOK_SECRET) {
        console.warn('[YCLOUD] Cannot verify signature: No YCLOUD_WEBHOOK_SECRET configured.');
        return false; // Fail safe if signature is expected but key is missing
    }

    try {
        const parts = signatureHeader.split(',');
        const tPart = parts.find(p => p.startsWith('t='));
        const sPart = parts.find(p => p.startsWith('s='));
        
        if (!tPart || !sPart) return false;
        
        const timestamp = tPart.split('=')[1];
        const receivedSignature = sPart.split('=')[1];
        
        const payloadToSign = `${timestamp}.${rawBody}`;

        const computedSignature = crypto
            .createHmac('sha256', ENV.YCLOUD_WEBHOOK_SECRET)
            .update(payloadToSign, 'utf8')
            .digest('hex');

        return computedSignature === receivedSignature;
    } catch (e) {
        return false;
    }
}

