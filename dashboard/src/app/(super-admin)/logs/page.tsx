import { requireSuperAdmin } from '@/lib/auth';
import LogsClient from './LogsClient';

export const revalidate = 0; // Prevent caching

export default async function SuperAdminLogsPage() {
    // 1. Enforce gatekeeping
    await requireSuperAdmin();

    // 2. Fetch the logs via our internal API mapping endpoint
    const res = await fetch(`http://127.0.0.1:${process.env.PORT || 5678}/api/admin/logs?limit=100`, {
        cache: 'no-store'
    });
    
    let logs = [];
    if (res.ok) {
        const body = await res.json();
        logs = body.data || [];
    } else {
        console.error('Failed to fetch logs server-side', await res.text());
    }

    // 3. Render the client-side component 
    return <LogsClient initialLogs={logs} />;
}
