import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client using cookie-based sessions.
 * Use this in Server Components and API routes.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Calling from Server Component — read-only cookies
                    }
                },
            },
        }
    );
}

/**
 * Get current authenticated session. Returns null if not logged in.
 */
export async function getSession() {
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session;
}

/**
 * Get current user with role & client_id metadata.
 */
export async function getUser() {
    const session = await getSession();
    if (!session) return null;

    return {
        id: session.user.id,
        email: session.user.email,
        role: (session.user.user_metadata?.role as string) || 'client',
        client_id: (session.user.user_metadata?.client_id as string) || null,
    };
}

/**
 * Require auth — throws redirect if not authenticated.
 * Use at the top of protected Server Components.
 */
export async function requireAuth() {
    const user = await getUser();
    if (!user) {
        const { redirect } = await import('next/navigation');
        redirect('/login');
    }
    return user;
}

/**
 * Require super admin role.
 */
export async function requireSuperAdmin() {
    const user = await requireAuth();
    if (user.role !== 'super_admin') {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }
    return user;
}
