'use client';

function formatInr(value: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

export default function CostsClient({ initialStats }: { initialStats: any }) {
    if (!initialStats) {
        return <div className="p-8 text-white">Loading costs...</div>;
    }

    const { aiTokens, whatsapp, payments, summary } = initialStats;

    return (
        <div className="flex flex-1 flex-col bg-[#0f1823] min-h-full">
            <div className="px-6 border-b border-[#30363d] bg-[#0d1117]">
                <div className="flex gap-8">
                    <div className="border-b-2 border-[#57a5ff] text-[#57a5ff] py-4 text-sm font-bold tracking-tight">API Costs & Margins</div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#0d1117] border border-[#30363d] shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-medium">Groq Tokens Cost</p>
                            <span className="material-symbols-outlined text-[#57a5ff]">token</span>
                        </div>
                        <p className="text-slate-100 text-3xl font-bold">{formatInr(aiTokens.costInr)}</p>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-2">
                            <span>{aiTokens.tokens.toLocaleString()} tokens used</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#0d1117] border border-[#30363d] shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-medium">WhatsApp Volume Cost</p>
                            <span className="material-symbols-outlined text-green-400">chat</span>
                        </div>
                        <p className="text-slate-100 text-3xl font-bold">{formatInr(whatsapp.costInr)}</p>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-2">
                            <span>{whatsapp.outbound.toLocaleString()} outbound msgs</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#0d1117] border border-[#30363d] shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-medium">Cashfree Fees</p>
                            <span className="material-symbols-outlined text-amber-400">payments</span>
                        </div>
                        <p className="text-slate-100 text-3xl font-bold">{formatInr(payments.costInr)}</p>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-2">
                            <span>1.8% of {formatInr(payments.revenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#30363d]">
                        <div className="p-8 flex flex-col justify-center gap-2">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Infrastructure Cost</p>
                            <p className="text-slate-100 text-2xl font-bold">{formatInr(summary.totalInfraCost)}</p>
                        </div>
                        <div className="p-8 flex flex-col justify-center gap-2">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Client Billing</p>
                            <p className="text-slate-100 text-2xl font-bold">{formatInr(summary.clientBilling)}</p>
                        </div>
                        <div className="p-8 lg:col-span-2 flex items-center justify-between bg-emerald-500/10">
                            <div className="flex flex-col gap-1">
                                <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Net Margin</p>
                                <p className="text-emerald-400 text-5xl font-black tracking-tighter">{formatInr(summary.netMargin)}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-3xl font-bold text-emerald-500">{summary.marginPercentage}%</div>
                                <div className="text-xs font-medium text-emerald-600/70">PROFITABILITY</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">data_exploration</span>
                    <p className="text-sm border border-[#30363d] px-4 py-2 rounded bg-[#0d1117]">
                        Metrics update automatically on every AI interaction and WhatsApp webhook.
                    </p>
                </div>
            </div>
        </div>
    );
}
