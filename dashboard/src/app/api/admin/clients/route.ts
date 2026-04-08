import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Super Admin API: Manage client accounts.
 * Only accessible by super_admin role.
 */

// GET: List all clients
export async function GET() {
    const user = await getUser();
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users from Supabase Auth (admin API)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to client-friendly format
    const clients = (users || [])
        .filter(u => u.user_metadata?.role === 'client')
        .map(u => ({
            id: u.id,
            email: u.email,
            client_id: u.user_metadata?.client_id || null,
            business_name: u.user_metadata?.business_name || 'Unknown',
            created_at: u.created_at,
            last_sign_in: u.last_sign_in_at,
        }));

    return NextResponse.json({ clients });
}

// POST: Create new client account
export async function POST(req: Request) {
    const user = await getUser();
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, business_name, client_id } = body;

    if (!email || !password || !business_name || !client_id) {
        return NextResponse.json(
            { error: 'Missing required fields: email, password, business_name, client_id' },
            { status: 400 }
        );
    }

    // Create user in Supabase Auth with metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since super admin creates them
        user_metadata: {
            role: 'client',
            client_id,
            business_name,
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        client: {
            id: data.user.id,
            email: data.user.email,
            client_id,
            business_name,
        }
    }, { status: 201 });
}
