'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface UnifiedLog {
    id: string;
    timestamp: string;
    type: 'whatsapp_message' | 'system_audit';
    source: string;
    direction: 'inbound' | 'outbound' | 'internal';
    severity: 'info' | 'warning' | 'error';
    summary: string;
    details: string;
    raw_payload: any;
}

export default function LogsClient({ initialLogs }: { initialLogs: UnifiedLog[] }) {
    const [logs, setLogs] = useState<UnifiedLog[]>(initialLogs);
    const [selectedLog, setSelectedLog] = useState<UnifiedLog | null>(null);

    const getSeverityColor = (severity: string) => {
        if (severity === 'warning') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (severity === 'error') return 'text-red-500 bg-red-500/10 border-red-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    const getTypeColor = (type: string) => {
        if (type === 'system_audit') return 'text-blue-400';
        return 'text-slate-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-100">Full System Audit & Logs</h2>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse hidden sm:block"></span>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest hidden sm:block">Live Connection</span>
                    <button onClick={() => window.location.reload()} className="ml-4 p-2 bg-[#161b22] border border-[#30363d] rounded-lg text-slate-400 hover:text-white transition">
                        <span className="material-symbols-outlined text-sm">refresh</span>
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Total Events</span>
                        <span className="material-symbols-outlined text-[#ec5b13] text-[20px]">bolt</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{logs.length}</div>
                </div>
                <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">WhatsApp Msg</span>
                        <span className="material-symbols-outlined text-blue-400 text-[20px]">forum</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">
                        {logs.filter(l => l.type === 'whatsapp_message').length}
                    </div>
                </div>
                <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">System Audits</span>
                        <span className="material-symbols-outlined text-purple-400 text-[20px]">history_edu</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">
                        {logs.filter(l => l.type === 'system_audit').length}
                    </div>
                </div>
                <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d]">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Warnings</span>
                        <span className="material-symbols-outlined text-amber-400 text-[20px]">warning</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">
                        {logs.filter(l => l.severity === 'warning').length}
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <section className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden">
                <div className="p-4 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5">
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Live Audit Timeline</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0d1117]/30 text-slate-500 font-bold border-b border-[#30363d] uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Event Type</th>
                                <th className="px-6 py-3">Metadata</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Raw</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d] font-mono">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 text-slate-400">
                                        {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, -5)}
                                    </td>
                                    <td className={`px-6 py-4 ${getTypeColor(log.type)}`}>
                                        {log.type.toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[#57a5ff] uppercase text-[10px]">{log.source}</span>
                                            <span className="text-slate-300 font-sans text-sm line-clamp-1 max-w-[300px]">{log.summary}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getSeverityColor(log.severity)}`}>
                                            {log.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="text-slate-500 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">terminal</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length === 0 && (
                        <div className="p-8 text-center text-slate-500 font-sans">
                            No log data found across clients.
                        </div>
                    )}
                </div>
            </section>

            {/* Slide-out Sheet for Raw Payload */}
            <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <SheetContent className="bg-[#161b22] border-l-[#30363d] text-slate-100 sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-white flex items-center gap-2 uppercase tracking-widest text-sm">
                            <span className="material-symbols-outlined text-[#57a5ff]">data_object</span>
                            Raw Event Payload
                        </SheetTitle>
                        <SheetDescription className="text-slate-400 font-mono text-xs">
                            {selectedLog?.id}
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
                            <div className="bg-[#0d1117] p-3 rounded border border-[#30363d]">
                                <span className="text-slate-500 block mb-1">timestamp</span>
                                <span className="text-white">{selectedLog && new Date(selectedLog.timestamp).toISOString()}</span>
                            </div>
                            <div className="bg-[#0d1117] p-3 rounded border border-[#30363d]">
                                <span className="text-slate-500 block mb-1">type</span>
                                <span className="text-white">{selectedLog?.type}</span>
                            </div>
                        </div>

                        <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
                            <div className="bg-[#30363d]/50 px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                JSON Snapshot
                            </div>
                            <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                                {JSON.stringify(selectedLog?.raw_payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}
