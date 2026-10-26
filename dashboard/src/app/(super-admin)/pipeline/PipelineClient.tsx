'use client';

function formatInr(value: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

export default function PipelineClient({ initialData }: { initialData: any }) {
    if (!initialData) return <div className="p-8 text-white">Loading pipeline...</div>;

    const { kpis, kanban, recentActivity } = initialData;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] text-slate-100 min-h-[calc(100vh-64px)]">
            <header className="h-16 flex items-center justify-between px-8 border-b border-[#30363d] bg-white/5 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-4">
                    <nav className="flex items-center text-sm font-medium gap-2">
                        <span className="text-slate-400">Admin</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-white">Sales Pipeline</span>
                    </nav>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-[#161b22] rounded-lg p-1 border border-[#30363d]">
                        <button className="px-3 py-1 text-xs font-semibold rounded-md text-slate-400 hover:text-white">Standard</button>
                        <button className="px-3 py-1 text-xs font-semibold rounded-md bg-[#ec5b13] text-white shadow-sm">Business Mode</button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Leads</p>
                        <h3 className="text-2xl font-bold tabular-nums text-white">{kpis.totalLeads}</h3>
                        <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">trending_up</span> Live Conversation Growth
                        </div>
                    </div>
                    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Qualified AI Intents</p>
                        <h3 className="text-2xl font-bold tabular-nums text-white">{kpis.qualified}</h3>
                        <div className="mt-2 text-[10px] text-[#ec5b13] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">checklist</span> High Buying Intent
                        </div>
                    </div>
                    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Pending Checkouts</p>
                        <h3 className="text-2xl font-bold tabular-nums text-white">{kpis.closing}</h3>
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">shopping_cart_checkout</span> Waiting for payment
                        </div>
                    </div>
                    <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Generated Revenue</p>
                        <h3 className="text-2xl font-bold tabular-nums text-emerald-400">{formatInr(kpis.revenue)}</h3>
                        <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">payments</span> Paid Orders
                        </div>
                    </div>
                </div>

                {/* KANBAN BOARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    
                    {/* Column 1 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">New Leads</h4>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {kanban.new_leads.map((l: any, i: number) => (
                                <div key={i} className="bg-[#161b22] border-l-4 border-slate-500 p-4 rounded-lg shadow-sm border border-[#30363d] border-l-[#57a5ff]">
                                    <h5 className="text-sm font-bold mb-1 text-white">{l.phone}</h5>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                                        <span className="px-1.5 py-0.5 bg-[#0d1117] rounded">{l.source}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-500">Unassigned</span>
                                        <span className="material-symbols-outlined text-[16px] text-slate-500">forum</span>
                                    </div>
                                </div>
                            ))}
                            {kanban.new_leads.length === 0 && <p className="text-xs text-slate-500 px-2">No new leads...</p>}
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Qualified</h4>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {kanban.qualified.map((l: any, i: number) => (
                                <div key={i} className="bg-[#161b22] border-l-4 border-[#57a5ff] p-4 rounded-lg shadow-sm border border-[#30363d]">
                                    <h5 className="text-sm font-bold mb-1 text-white">{l.phone}</h5>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                                        <span className="px-1.5 py-0.5 bg-[#0d1117] rounded">{l.source}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-500">AI Managed</span>
                                        <span className="material-symbols-outlined text-[16px] text-[#57a5ff]">smart_toy</span>
                                    </div>
                                </div>
                            ))}
                            {kanban.qualified.length === 0 && <p className="text-xs text-slate-500 px-2">No qualified leads...</p>}
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#ec5b13]"></span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Checkout Pending</h4>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {kanban.closing.map((l: any, i: number) => (
                                <div key={i} className="bg-[#161b22] border-l-4 border-[#ec5b13] p-4 rounded-lg shadow-sm border border-[#30363d]">
                                    <h5 className="text-sm font-bold mb-1 text-white">{l.phone}</h5>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-500">Awaiting UPI</span>
                                        <span className="material-symbols-outlined text-[16px] text-[#ec5b13]">hourglass_empty</span>
                                    </div>
                                </div>
                            ))}
                            {kanban.closing.length === 0 && <p className="text-xs text-slate-500 px-2">Empty...</p>}
                        </div>
                    </div>

                    {/* Column 4 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Won Pipeline</h4>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {kanban.won.map((l: any, i: number) => (
                                <div key={i} className="bg-[#161b22] border-l-4 border-emerald-500 p-4 rounded-lg shadow-sm border border-[#30363d]">
                                    <h5 className="text-sm font-bold mb-1 text-white">{l.phone}</h5>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[10px] font-medium text-slate-500">Paid & Verified</span>
                                        <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                                    </div>
                                </div>
                            ))}
                            {kanban.won.length === 0 && <p className="text-xs text-slate-500 px-2">No wins yet.</p>}
                        </div>
                    </div>

                </div>

                {/* RECENT ACTIVITY TABLE */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Recent Conversions & Activity</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0d1117] text-slate-500 uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-3">Phone Identity</th>
                                    <th className="px-6 py-3">Source</th>
                                    <th className="px-6 py-3">Stage</th>
                                    <th className="px-6 py-3">Probability</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]">
                                {recentActivity.map((r: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-white">{r.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{r.source}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                                                r.stage === 'Qualified' ? 'bg-blue-500/10 text-blue-400' :
                                                r.stage === 'New Lead' ? 'bg-[#30363d] text-slate-300' :
                                                'bg-emerald-500/10 text-emerald-400'
                                            }`}>
                                                {r.stage}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono tabular-nums text-slate-300">{r.probability}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
