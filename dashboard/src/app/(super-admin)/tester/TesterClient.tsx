'use client';

import { useState } from 'react';

interface TesterClientProps {
    clients: { client_id: string; business_name: string }[];
}

export default function TesterClient({ clients }: TesterClientProps) {
    const [selectedClient, setSelectedClient] = useState(clients[0]?.client_id || '');
    const [phone, setPhone] = useState('+919876543210');
    const [message, setMessage] = useState('I am looking for the latest availability.');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runTest = async () => {
        if (!selectedClient || !message) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient,
                    phone: phone,
                    message: message
                })
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
            alert('Failed to run simulation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#161B22] text-slate-100">
            {/* Left Panel: Config */}
            <section className="w-[420px] border-r border-[#30363d] flex flex-col p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-tight uppercase">Bot Flow Tester</h2>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">DRY RUN</span>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Client Scope</label>
                    <select 
                        value={selectedClient} 
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg text-sm p-3 focus:ring-[#ec5b13] focus:border-[#ec5b13]"
                    >
                        {clients.map(c => (
                            <option key={c.client_id} value={c.client_id}>{c.business_name || c.client_id}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Test Phone Number</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">phone</span>
                        <input 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm p-3 focus:ring-[#ec5b13] focus:border-[#ec5b13]" 
                            type="text" 
                        />
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Test Message</label>
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 w-full bg-[#0d1117] border border-[#30363d] rounded-lg text-sm p-4 focus:ring-[#ec5b13] focus:border-[#ec5b13] resize-none font-mono" 
                    />
                </div>

                <button 
                    onClick={runTest}
                    disabled={loading}
                    className="w-full bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white text-sm font-bold p-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-sm">{loading ? 'sync' : 'play_arrow'}</span>
                    {loading ? 'SIMULATING...' : 'RUN PIPELINE TEST'}
                </button>
            </section>

            {/* Right Panel: Pipeline Trace */}
            <section className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-white">
                        <span className="material-symbols-outlined text-[#ec5b13] text-base">route</span>
                        PIPELINE TRACE
                    </h2>
                    {result && (
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase">Total Latency</p>
                                <p className="text-xs font-mono font-bold text-green-500">{result.latency}ms</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 relative pointer-events-none">
                    {!result && !loading && (
                        <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2">
                            <span className="material-symbols-outlined text-4xl mb-2">science</span>
                            Submit a test to visualize the AI inference pipeline
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            Running model pipeline...
                        </div>
                    )}

                    {result && !loading && (
                        <>
                            {/* Step 1: Input */}
                            <div className="relative flex gap-6">
                                <div className="absolute left-[19px] top-[32px] bottom-[-32px] w-[2px] bg-[#30363d] z-0"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="size-10 rounded-full bg-[#161b22] border-2 border-[#30363d] flex items-center justify-center text-xs font-bold font-mono">01</div>
                                </div>
                                <div className="flex-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-400">webhook</span>
                                            <span className="text-sm font-bold">Inbound Local Simulation</span>
                                            <span className="px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 text-[10px] font-bold">200 OK</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#0d1117] p-2 rounded text-[11px] font-mono text-slate-400">
                                        {`{ source: "internal_tool", user: "${phone}", msg: "${message}" }`}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: AI Process */}
                            <div className="relative flex gap-6">
                                <div className="absolute left-[19px] top-[32px] bottom-[-32px] w-[2px] bg-[#30363d] z-0"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="size-10 rounded-full bg-[#161b22] border-2 border-[#ec5b13]/50 flex items-center justify-center text-xs font-bold font-mono shadow-[0_0_15px_rgba(236,91,19,0.2)]">02</div>
                                </div>
                                <div className="flex-1 bg-[#161b22] rounded-xl border border-[#ec5b13]/30 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#ec5b13]">smart_toy</span>
                                            <span className="text-sm font-bold">AI Intent + Catalog Matching</span>
                                            <span className="px-1.5 py-0.5 rounded bg-[#ec5b13]/10 text-[#ec5b13] text-[10px] font-bold">GROQ</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">{result.tokens?.time_seconds * 1000 || result.latency}ms</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Intent</p>
                                            <p className="text-xs text-[#ec5b13] font-bold">{result.ai?.intent}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Action Engine</p>
                                            <p className="text-xs text-white uppercase font-mono">{result.ai?.action}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Language</p>
                                            <p className="text-xs text-slate-300 font-mono">{result.ai?.language_hint}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Products Injected</p>
                                            <p className="text-xs text-slate-300 font-mono">{result.productsInjected}</p>
                                        </div>
                                    </div>

                                    {/* Found Products array display */}
                                    {result.ai?.products?.length > 0 && (
                                        <div className="mt-2 border-t border-[#30363d] pt-2">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Matched Products</p>
                                            <div className="flex flex-wrap gap-2">
                                                {result.ai.products.map((p: any, idx: number) => (
                                                    <span key={idx} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-1 rounded">
                                                        {p.title} (${p.price})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Assistant Reply */}
                            <div className="relative flex gap-6">
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="size-10 rounded-full bg-[#161b22] border-2 border-[#30363d] flex items-center justify-center text-xs font-bold font-mono">03</div>
                                </div>
                                <div className="flex-1 bg-[#161b22] rounded-xl border border-[#30363d] p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-green-400">forum</span>
                                            <span className="text-sm font-bold">Generated Assistant Response</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#0d1117] p-3 rounded text-sm text-slate-200 border-l-2 border-green-400 font-sans">
                                        {result.ai?.text}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Metrics */}
                {result && (
                    <div className="bg-[#161b22] border-t border-[#30363d] p-6 flex items-center justify-between mt-auto">
                        <div className="flex gap-10">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">State Mutations</p>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-green-400">check_circle</span>
                                    <span className="text-xs font-mono">last_intent: {result.ai?.intent}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Tokens Used</p>
                                <div className="flex items-center gap-2 text-xs font-mono">
                                    <span className="text-slate-400">Prompt:</span> <span className="text-slate-200">{result.tokens?.prompt || 0}</span>
                                    <span className="text-slate-400 ml-2">Comp:</span> <span className="text-slate-200">{result.tokens?.completion || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
