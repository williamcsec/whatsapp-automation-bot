'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message === 'Invalid login credentials'
                    ? 'Invalid Client ID or password. Please try again.'
                    : authError.message
                );
                setLoading(false);
                return;
            }

            // Route based on role
            const role = data.user?.user_metadata?.role || 'client';
            if (role === 'super_admin') {
                router.push('/super-admin');
            } else {
                router.push('/dashboard');
            }
            router.refresh();
        } catch (err: any) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-background-light dark:bg-background-dark font-display">
            <header className="flex items-center justify-between px-6 py-4 absolute top-0 left-0 w-full z-10 lg:w-1/2">
                <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                    <div className="size-6 text-primary">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold leading-tight tracking-tight">AutomatXpress</h2>
                </div>
            </header>

            <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-slate-900 dark:bg-slate-950 p-12 relative overflow-hidden h-screen">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="max-w-md text-center relative z-10">
                    <h1 className="text-slate-100 text-5xl font-black leading-tight tracking-tight mb-6 drop-shadow-lg">
                        Automate your WhatsApp Sales
                    </h1>
                    <p className="text-slate-300 text-lg font-medium leading-relaxed">
                        Log in to access your exclusive eCommerce admin dashboard and scale your business effortlessly.
                    </p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-slate-950 to-transparent opacity-80 pointer-events-none"></div>
            </div>

            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-6 lg:p-12 min-h-[100dvh] bg-white dark:bg-background-dark">
                <div className="w-full max-w-md">
                    <div className="mb-8 mt-12 lg:mt-0">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Please enter your credentials to access your account.</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                            <span className="material-icons text-red-500 text-lg">error_outline</span>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <label className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email / Client ID</span>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                                    <span className="material-icons text-xl">badge</span>
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200"
                                    placeholder="Enter your email"
                                    disabled={loading}
                                />
                            </div>
                        </label>

                        <label className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</span>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                                    <span className="material-icons text-xl">lock</span>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input block w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                                >
                                    <span className="material-icons text-xl">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </label>

                        <div className="flex items-center justify-between mt-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 text-primary bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-primary focus:ring-offset-0 transition-colors" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
                            </label>
                            <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-white dark:focus:ring-offset-background-dark transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Log In'}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-4">
                        <span className="material-icons text-primary text-2xl mt-0.5">forum</span>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Exclusive Access Only</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Registration is by invitation. Please contact the AutomatXpress team via WhatsApp to get started and receive your credentials.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
