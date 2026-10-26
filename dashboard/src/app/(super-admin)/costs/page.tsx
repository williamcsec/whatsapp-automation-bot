import { requireSuperAdmin } from '@/lib/auth';
import CostsClient from './CostsClient';

export const revalidate = 0;

export default async function CostsPage() {
    await requireSuperAdmin();

    const res = await fetch(`http://127.0.0.1:${process.env.PORT || 5678}/api/admin/costs`, {
        cache: 'no-store'
    });
    
    let stats = null;
    if (res.ok) {
        const body = await res.json();
        stats = body.data;
    }

    return <CostsClient initialStats={stats} />;
}
