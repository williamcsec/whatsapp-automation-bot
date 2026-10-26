import { requireSuperAdmin } from '@/lib/auth';
import { query } from '../../../../../../src/services/db';
import TesterClient from './TesterClient';

export const revalidate = 0;

export default async function FlowTesterPage() {
    await requireSuperAdmin();

    // Fetch clients to populate the dropdown
    const clientRes = await query(`SELECT client_id, business_name FROM clients ORDER BY business_name ASC`);
    const clients = clientRes.rows;

    return <TesterClient clients={clients} />;
}
