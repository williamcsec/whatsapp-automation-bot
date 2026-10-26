import { requireSuperAdmin } from '@/lib/auth';
import PipelineClient from './PipelineClient';

export const revalidate = 0;

export default async function PipelinePage() {
    await requireSuperAdmin();

    const res = await fetch(`http://127.0.0.1:${process.env.PORT || 5678}/api/admin/pipeline`, {
        cache: 'no-store'
    });
    
    let dbData = null;
    if (res.ok) {
        const body = await res.json();
        dbData = body.data;
    }

    return <PipelineClient initialData={dbData} />;
}
