import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden antialiased bg-[#0d1117] text-slate-100">
            <SuperAdminSidebar />
            <main className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]/50">
                {/* Top Bar */}
                <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="hover:text-white cursor-pointer transition-colors">AutomatXpress</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-white font-medium">Mission Control</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-white">notifications</span>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
