import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware — protects dashboard and super-admin routes.
 * Runs on EVERY matched request before the page loads.
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session (important for token rotation)
    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // --- Unauthenticated users ---
    if (!user) {
        // Allow login page
        if (path === '/login') return supabaseResponse;
        // Redirect everything else to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // --- Authenticated users ---
    const role = (user.user_metadata?.role as string) || 'client';

    // If on login page but already authenticated, redirect to appropriate dashboard
    if (path === '/login') {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = role === 'super_admin' ? '/super-admin' : '/dashboard';
        return NextResponse.redirect(dashUrl);
    }

    // Protect super-admin routes — only super_admin role
    if (path.startsWith('/super-admin') && role !== 'super_admin') {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashUrl);
    }

    return supabaseResponse;
}

// Match all routes except static files, images, favicon
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
