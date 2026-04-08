import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUser } from '@/lib/auth';

// Helper to send WhatsApp messages via YCloud API
async function sendWhatsAppMessage(to: string, text: string) {
    const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
    const payload = {
        from: process.env.WHATSAPP_BUSINESS_PHONE,
        to: to,
        type: 'text',
        text: { body: text }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.YCLOUD_API_KEY || ''
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errPayload = await response.text();
        throw new Error(`YCloud API Error [${response.status}]: ${errPayload}`);
    }

    return await response.json();
}

export async function POST(req: Request) {
    try {
        // --- AUTH CHECK: Require valid session ---
        const user = await getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized — please log in' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { customerId, customerPhone, text } = body;

        // Use the authenticated user's client_id instead of accepting it from the request
        const clientId = user.role === 'super_admin' ? (body.clientId || user.client_id) : user.client_id;

        if (!clientId || !customerId || !customerPhone || !text) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Send actual message via YCloud
        await sendWhatsAppMessage(customerPhone, text);

        // 2. Log outbound message to Supabase
        const supabase = await createSupabaseServerClient();
        const newMsg = {
            client_id: clientId,
            customer_id: customerId,
            customer_phone: customerPhone,
            direction: 'outbound',
            message_type: 'text',
            text_body: text,
            is_human_override: true
        };

        const { data, error } = await supabase
            .from('conversations')
            .insert(newMsg)
            .select()
            .single();

        if (error) {
            console.error('[API Send Message] DB Insert Error:', error);
            return NextResponse.json(
                { error: 'Failed to log message in DB' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: data });
    } catch (error: any) {
        console.error('[API Send Message] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
