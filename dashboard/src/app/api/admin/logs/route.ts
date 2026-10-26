import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        await requireSuperAdmin();

        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get('limit') || '50';
        const limit = parseInt(limitParam, 10);

        // Fetch WhatsApp message logs
        const { data: messages, error: msgError } = await supabaseAdmin
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (msgError) throw msgError;

        // Fetch System Audit logs
        const { data: audits, error: auditError } = await supabaseAdmin
            .from('reservation_audit')
            .select('*')
            .order('changed_at', { ascending: false })
            .limit(limit);

        if (auditError) throw auditError;

        // Map messages to unified log shape
        const messageLogs = (messages || []).map(m => ({
            id: m.id,
            timestamp: m.created_at,
            type: 'whatsapp_message',
            source: m.waba_id, // Identifies the client
            direction: m.direction,
            severity: 'info',
            summary: `${m.direction === 'inbound' ? 'Received from' : 'Sent to'} ${m.phone_number}`,
            details: m.text_body,
            raw_payload: m,
        }));

        // Map audits to unified log shape
        const auditLogs = (audits || []).map(a => ({
            id: `audit_${a.id}`,
            timestamp: a.changed_at,
            type: 'system_audit',
            source: 'Reservation Engine',
            direction: 'internal',
            severity: a.to_state === 'expired' || a.to_state === 'fraud_suspected' ? 'warning' : 'info',
            summary: `Order ${a.order_id?.slice(0, 8) || 'N/A'}: ${a.from_state} → ${a.to_state}`,
            details: a.reason,
            raw_payload: a,
        }));

        // Merge, sort descending, and crop to requested limit
        const unifiedLogs = [...messageLogs, ...auditLogs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

        return NextResponse.json({ success: true, data: unifiedLogs });

    } catch (error: any) {
        console.error('Super Admin Logs API Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch logs' }, { status: 500 });
    }
}
