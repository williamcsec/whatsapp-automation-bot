'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Mission Control', icon: 'dashboard', href: '/super-admin' },
    { label: 'All Clients', icon: 'group', href: '/super-admin/clients' },
    { label: 'System Health', icon: 'monitor_heart', href: '/super-admin/system' },
    { label: 'API Costs', icon: 'payments', href: '/super-admin/api-costs' },
    { label: 'Business Overview', icon: 'query_stats', href: '/super-admin/business' },
];

export function SuperAdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 flex-shrink-0 flex flex-col border-r border-[#30363d] bg-[#0d1117]">
            {/* Brand */}
            <div className="p-4 flex items-center gap-3 border-b border-[#30363d]">
                <div className="size-8 bg-[#57a5ff] rounded flex items-center justify-center text-[#0d1117]">
                    <span className="material-symbols-outlined font-bold text-lg">bolt</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight text-white">AutomatXpress</span>
                    <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 w-fit">ADMIN</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                isActive
                                    ? 'bg-[#57a5ff]/10 border-l-2 border-[#57a5ff] text-[#57a5ff]'
                                    : 'hover:bg-[#161b22] text-slate-400 hover:text-slate-100 border-l-2 border-transparent'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold border border-[#30363d]">
                        SA
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white">Superadmin</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">v1.0.0</span>
                    </div>
                </div>
                <form action="/api/auth/logout" method="POST">
                    <button type="submit" className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </form>
            </div>
        </aside>
    );
}
