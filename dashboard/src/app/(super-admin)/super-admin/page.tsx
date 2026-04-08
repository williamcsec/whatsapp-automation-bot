import { supabaseAdmin } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth';
import MissionControlClient from './MissionControlClient';

export const revalidate = 0;

interface ClientHealthData {
    id: string;
    email: string;
    client_id: string;
    business_name: string;
    revenue_today: number;
    orders_today: number;
    health_status: 'healthy' | 'warning' | 'critical';
    issue?: string;
}

export default async function SuperAdminMissionControl() {
    await requireSuperAdmin();

    // Fetch all client users
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const clients = (users || []).filter(u => u.user_metadata?.role === 'client');

    // Fetch today's revenue per client
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clientHealthData: ClientHealthData[] = [];

    for (const client of clients) {
        const clientId = client.user_metadata?.client_id;
        if (!clientId) continue;

        // Revenue today
        const { data: orders } = await supabaseAdmin
            .from('completed_orders')
            .select('total_amount')
            .eq('client_id', clientId)
            .gte('completed_at', today.toISOString());

        const revToday = (orders || []).reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);

        // Orders today
        const { count: orderCount } = await supabaseAdmin
            .from('pending_orders')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .gte('reserved_at', today.toISOString());

        // System health check (latest entry)
        const { data: health } = await supabaseAdmin
            .from('system_health')
            .select('*')
            .order('checked_at', { ascending: false })
            .limit(2);

        const hasDownService = (health || []).some((h: any) => h.status === 'down');

        clientHealthData.push({
            id: client.id,
            email: client.email || '',
            client_id: clientId,
            business_name: client.user_metadata?.business_name || 'Unknown',
            revenue_today: revToday,
            orders_today: orderCount || 0,
            health_status: hasDownService ? 'critical' : revToday === 0 ? 'warning' : 'healthy',
            issue: hasDownService ? 'Service degradation detected' : undefined,
        });
    }

    // Fetch latest system health
    const { data: healthData } = await supabaseAdmin
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

    // Fetch recent audit logs for alerts
    const { data: auditData } = await supabaseAdmin
        .from('reservation_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(5);

    return (
        <MissionControlClient
            clients={clientHealthData}
            healthChecks={healthData || []}
            auditLogs={auditData || []}
        />
    );
}
