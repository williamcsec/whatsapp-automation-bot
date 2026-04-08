'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';

interface ClientHealth {
    id: string;
    email: string;
    client_id: string;
    business_name: string;
    revenue_today: number;
    orders_today: number;
    health_status: 'healthy' | 'warning' | 'critical';
    issue?: string;
}

interface Props {
    clients: ClientHealth[];
    healthChecks: any[];
    auditLogs: any[];
}

const statusColors = {
    healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/50' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', hover: 'hover:border-amber-500/50' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', hover: 'hover:border-red-500/50' },
};

const serviceList = ['Redis', 'Groq', 'YCloud', 'Cashfree', 'Supabase', 'Bot Webhook'];

export default function MissionControlClient({ clients, healthChecks, auditLogs }: Props) {
    const [showAddClient, setShowAddClient] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', business_name: '', client_id: '' });
    const [creating, setCreating] = useState(false);

    const allServicesHealthy = healthChecks.length === 0 || healthChecks.every((h: any) => h.status === 'healthy');

    const handleCreateClient = async () => {
        setCreating(true);
        try {
            const res = await fetch('/api/admin/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowAddClient(false);
                setFormData({ email: '', password: '', business_name: '', client_id: '' });
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create client');
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Live Infrastructure Status */}
            <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Infrastructure Status</h3>
                    <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        allServicesHealthy
                            ? 'text-emerald-400 bg-emerald-400/10'
                            : 'text-red-400 bg-red-400/10'
                    }`}>
                        <span className={`size-1.5 rounded-full ${allServicesHealthy ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></span>
                        {allServicesHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'ISSUE DETECTED'}
                    </span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {serviceList.map((service) => (
                        <div key={service} className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg">
                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                            <span className="text-xs font-medium">{service}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-12 gap-6">
                {/* Client Grid */}
                <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {clients.map((client) => {
                        const colors = statusColors[client.health_status];
                        return (
                            <div key={client.id} className={`bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col p-5 group ${colors.hover} transition-all shadow-lg`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`size-10 ${colors.bg} ${colors.text} rounded-lg flex items-center justify-center`}>
                                        <span className="material-symbols-outlined">storefront</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${colors.bg} ${colors.text} px-2 py-0.5 rounded border ${colors.border} uppercase`}>
                                        {client.health_status}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-white mb-1">{client.business_name}</h4>
                                <div className="space-y-1 mb-6">
                                    <p className="text-xl font-bold text-slate-100">
                                        ₹{client.revenue_today.toLocaleString('en-IN')}
                                        <span className="text-xs font-normal text-slate-500 ml-1">today</span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {client.orders_today} orders processed
                                    </p>
                                    {client.issue && (
                                        <p className={`text-xs ${colors.text} flex items-center gap-1`}>
                                            <span className="material-symbols-outlined text-[14px]">
                                                {client.health_status === 'critical' ? 'error' : 'warning'}
                                            </span>
                                            {client.issue}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <button className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[11px] font-bold hover:bg-[#161b22] flex items-center justify-center gap-1.5 transition-colors">
                                        <span className="material-symbols-outlined text-sm">description</span> View Logs
                                    </button>
                                    <button className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[11px] font-bold hover:bg-[#161b22] flex items-center justify-center gap-1.5 transition-colors">
                                        <span className="material-symbols-outlined text-sm">terminal</span> Debug
                                    </button>
                                    <button className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[11px] font-bold hover:bg-[#161b22] flex items-center justify-center gap-1.5 transition-colors">
                                        <span className="material-symbols-outlined text-sm">open_in_new</span> Dashboard
                                    </button>
                                    <button className="px-3 py-2 bg-[#57a5ff] text-[#0d1117] rounded-lg text-[11px] font-bold hover:bg-[#57a5ff]/90 flex items-center justify-center gap-1.5 transition-colors">
                                        <span className="material-symbols-outlined text-sm">smart_toy</span> Test Bot
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Client Ghost Card */}
                    <button
                        onClick={() => setShowAddClient(true)}
                        className="border-2 border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center p-8 hover:bg-[#161b22] hover:border-[#57a5ff]/50 cursor-pointer transition-all group min-h-[240px]"
                    >
                        <div className="size-12 rounded-full border border-[#30363d] flex items-center justify-center mb-3 group-hover:bg-[#57a5ff]/10 group-hover:text-[#57a5ff] transition-all text-slate-400">
                            <span className="material-symbols-outlined">add</span>
                        </div>
                        <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Add New Client</span>
                        <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Provision Instance</span>
                    </button>
                </div>

                {/* Alert Feed */}
                <aside className="col-span-12 lg:col-span-3">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Global Alert Feed</h3>
                            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-black">LIVE</span>
                        </div>
                        <div className="space-y-6">
                            {auditLogs.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4">No recent alerts</p>
                            ) : (
                                auditLogs.map((log: any, i: number) => {
                                    const borderColor = log.to_state === 'expired' ? 'border-red-500' : log.to_state === 'payment_pending' ? 'border-amber-500' : 'border-blue-500';
                                    const dotColor = log.to_state === 'expired' ? 'bg-red-500' : log.to_state === 'payment_pending' ? 'bg-amber-500' : 'bg-blue-500';
                                    const textColor = log.to_state === 'expired' ? 'text-red-400' : log.to_state === 'payment_pending' ? 'text-amber-400' : 'text-blue-400';

                                    return (
                                        <div key={i} className={`relative pl-6 border-l-2 ${borderColor}`}>
                                            <div className={`absolute -left-[5px] top-0 size-2 rounded-full ${dotColor}`}></div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[11px] font-bold ${textColor} uppercase`}>
                                                        {log.from_state} → {log.to_state}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-medium">
                                                        {new Date(log.changed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-100 font-medium">
                                                    {log.reason || `Order ${log.order_id?.slice(0, 8)} state change`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="mt-8 pt-4 border-t border-[#30363d]">
                            <button className="w-full py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[11px] font-bold text-slate-400 hover:text-white transition-colors">
                                View Full Audit Log
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Add Client Dialog */}
            <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogContent className="bg-[#161b22] border-[#30363d] text-white">
                    <DialogHeader>
                        <DialogTitle>Provision New Client</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Create login credentials for a new client business.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs font-medium text-slate-300 mb-1 block">Business Name</label>
                            <input
                                value={formData.business_name}
                                onChange={(e) => setFormData(p => ({ ...p, business_name: e.target.value }))}
                                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[#57a5ff] focus:border-[#57a5ff]"
                                placeholder="Karol Bagh Electronics"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-300 mb-1 block">Client ID (WABA ID)</label>
                            <input
                                value={formData.client_id}
                                onChange={(e) => setFormData(p => ({ ...p, client_id: e.target.value }))}
                                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[#57a5ff] focus:border-[#57a5ff]"
                                placeholder="1538618550574642"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-300 mb-1 block">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[#57a5ff] focus:border-[#57a5ff]"
                                placeholder="client@business.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-300 mb-1 block">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[#57a5ff] focus:border-[#57a5ff]"
                                placeholder="Set a strong password"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setShowAddClient(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateClient}
                            disabled={creating || !formData.email || !formData.password || !formData.business_name || !formData.client_id}
                            className="px-4 py-2 bg-[#57a5ff] text-[#0d1117] rounded-lg text-sm font-bold hover:bg-[#57a5ff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {creating ? 'Creating...' : 'Create Client'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
