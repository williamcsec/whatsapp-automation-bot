import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden antialiased bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* We can pass dynamic titles/subtitles later via context or props from children */}
                <Header title="Dashboard" subtitle="Overview" />
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col md:flex-row gap-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
