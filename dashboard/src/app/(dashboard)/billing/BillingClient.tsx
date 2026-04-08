"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Invoice, CompletedOrder, InvoiceItem } from "@/types/billing";
import { toast } from "sonner";

interface BillingClientProps {
    initialInvoices: Invoice[];
    initialOrders: CompletedOrder[];
}

export default function BillingClient({ initialInvoices, initialOrders }: BillingClientProps) {
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
    const [orders] = useState<CompletedOrder[]>(initialOrders);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
    const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'generated' | 'sent' | 'paid'>('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

    const toggleOrderSelect = (orderId: number) => {
        setSelectedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.size === orders.length && orders.length > 0) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(orders.map(o => o.id)));
        }
    };

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const selectedTotal = selectedOrders.reduce((sum, o) => sum + (o.total_amount || o.product_price || 0), 0);
    const selectedCustomerName = selectedOrders.length > 0 ? selectedOrders[0].customer_name : null;

    const filteredInvoices = invoices.filter(inv => {
        if (invoiceFilter === 'all') return true;
        return inv.status === invoiceFilter;
    });

    const generateInvoice = async () => {
        if (selectedOrders.length === 0) {
            toast.error("Select at least one order");
            return;
        }

        setIsGenerating(true);

        try {
            const { data: invNumResult, error: fnError } = await supabase
                .rpc('generate_invoice_number', { p_client_id: 'default_client' });

            if (fnError) throw fnError;

            const invoiceNumber = invNumResult as string;

            const items: InvoiceItem[] = selectedOrders.map(o => ({
                product_name: o.product_name || 'Unknown Product',
                quantity: 1,
                unit_price: o.product_price || 0,
                total: o.total_amount || o.product_price || 0,
                order_number: o.order_number || o.order_id,
            }));

            const subtotal = items.reduce((sum, item) => sum + item.total, 0);

            const newInvoice = {
                client_id: 'default_client',
                invoice_number: invoiceNumber,
                customer_name: selectedOrders[0].customer_name || 'Unknown',
                customer_phone: selectedOrders[0].invoice_customer_phone || selectedOrders[0].customer_phone,
                customer_email: selectedOrders[0].invoice_customer_email || selectedOrders[0].customer_email,
                items: items,
                subtotal: subtotal,
                tax_amount: subtotal * 0.18, // 18% dummy tax
                total_amount: subtotal * 1.18,
                status: 'generated' as const,
            };

            const { data, error } = await supabase
                .from('invoices')
                .insert(newInvoice)
                .select()
                .single();

            if (error) throw error;

            setInvoices(prev => [data as Invoice, ...prev]);
            setSelectedOrderIds(new Set());
            toast.success(`Invoice ${invoiceNumber} generated!`);
            setPreviewInvoice(data as Invoice); // Auto-open preview
        } catch (err: any) {
            toast.error("Failed to generate invoice: " + (err?.message || 'Unknown error'));
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount?: number) => {
        if (!amount) return '₹0';
        return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    const statusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; icon: string }> = {
            generated: { bg: 'bg-[#13ec37]/10 dark:bg-[#13ec37]/20', text: 'text-[#13ec37]', icon: 'check_circle' },
            sent: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: 'send' },
            paid: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: 'payments' },
            cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'cancel' },
        };
        const c = config[status] || config.generated;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
                <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="flex flex-col w-full -m-4 lg:-m-6 h-[calc(100vh-64px)] overflow-hidden bg-background-light dark:bg-slate-900 font-display">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Billing & Invoices</h2>
                <div className="flex items-center gap-4">
                    <div className="relative hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                        <input
                            className="w-64 pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-transparent focus:border-[#13ec37] focus:ring-1 focus:ring-[#13ec37] text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-shadow"
                            placeholder="Search invoices..."
                            type="text"
                        />
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative">
                {/* Section 1: Generate New Invoice */}
                <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pending Orders</h3>
                        <div className="flex gap-3">
                            <select className="appearance-none pl-4 pr-10 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:ring-[#13ec37] focus:border-[#13ec37] outline-none cursor-pointer">
                                <option>All Customers</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="py-3 px-6 w-12 text-center">
                                        <input
                                            className="rounded border-slate-300 text-[#13ec37] focus:ring-[#13ec37] bg-transparent checked:bg-[#13ec37] w-4 h-4"
                                            type="checkbox"
                                            checked={selectedOrderIds.size === orders.length && orders.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Name</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Sold</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Amount (₹)</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {orders.map(order => {
                                    const isSelected = selectedOrderIds.has(order.id);
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => toggleOrderSelect(order.id)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#13ec37]/5 dark:bg-[#13ec37]/10' : ''}`}
                                        >
                                            <td className="py-4 px-6 text-center">
                                                <input
                                                    className="rounded border-slate-300 text-[#13ec37] focus:ring-[#13ec37] bg-transparent checked:bg-[#13ec37] w-4 h-4"
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleOrderSelect(order.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm border-slate-900 dark:text-white font-medium">{order.customer_name || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500">{order.order_number || order.order_id}</p>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500">{formatDate(order.completed_at)}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-slate-900 dark:text-white text-right">{formatCurrency(order.total_amount || order.product_price)}</td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrderIds(new Set([order.id]));
                                                        generateInvoice();
                                                    }}
                                                    className="text-sm font-bold text-[#13ec37] hover:text-[#13ec37]/80 transition-colors"
                                                >
                                                    Create
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 2: Invoice Status Tracking */}
                <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col mb-24">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generated Invoices</h3>
                        <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-lg p-1">
                            {(['all', 'generated', 'sent', 'paid'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setInvoiceFilter(f)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${invoiceFilter === f
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Amount (₹)</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                                            No invoices generated yet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map(inv => (
                                        <tr
                                            key={inv.id}
                                            onClick={() => setPreviewInvoice(inv)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-6 text-sm font-bold text-[#13ec37]">{inv.invoice_number}</td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm text-slate-900 dark:text-white font-medium">{inv.customer_name}</p>
                                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{inv.items.length} items</p>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-500">{formatDate(inv.created_at)}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-slate-900 dark:text-white text-right">{formatCurrency(inv.total_amount)}</td>
                                            <td className="py-4 px-6 text-center">{statusBadge(inv.status)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Floating Action Bar */}
            {selectedOrderIds.size > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 ml-8 lg:ml-32 flex items-center gap-6 bg-[#1a361e] text-white px-6 py-4 rounded-xl shadow-2xl border border-[#2d5e34] z-10 w-auto max-w-2xl animate-in slide-in-from-bottom border-[rgba(19,236,55,0.2)] shadow-[0_10px_40px_-10px_rgba(19,236,55,0.3)]">
                    <div className="flex items-center gap-2 border-r border-[#2d5e34]/50 pr-6">
                        <span className="material-symbols-outlined text-[#13ec37]">check_circle</span>
                        <span className="font-medium text-sm whitespace-nowrap">{selectedOrderIds.size} Products Selected</span>
                    </div>
                    <div className="flex-1 whitespace-nowrap">
                        <span className="text-sm text-slate-400">Total:</span>
                        <span className="ml-2 font-bold text-lg">{formatCurrency(selectedTotal)}</span>
                    </div>
                    <button
                        onClick={generateInvoice}
                        disabled={isGenerating}
                        className="py-2.5 px-6 rounded-lg bg-[#13ec37] text-slate-900 font-bold text-sm hover:bg-[#13ec37]/90 transition-colors whitespace-nowrap shadow-[0_0_15px_rgba(19,236,55,0.3)] disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Create Consolidated Invoice'}
                    </button>
                    {selectedOrderIds.size > 0 && (
                         <button onClick={() => setSelectedOrderIds(new Set())} className="ml-2 p-1 text-slate-400 hover:text-white">
                             <span className="material-symbols-outlined text-[18px]">close</span>
                         </button>
                    )}
                </div>
            )}

            {/* Invoice Preview Modal (Split Pane) */}
            {previewInvoice && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex z-[100] animate-in fade-in">
                    {/* Dark Modal Container taking almost full screen */}
                    <div className="m-4 lg:m-8 flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Left Panel: PDF Preview A4 format */}
                        <section className="flex-1 flex flex-col overflow-y-auto border-r border-slate-200 dark:border-slate-800 p-8 bg-slate-50 dark:bg-slate-950/50">
                            <div className="mb-6 flex items-baseline justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Invoice Preview</h1>
                                    <p className="text-sm text-slate-500 mt-1">Previewing #{previewInvoice.invoice_number}</p>
                                </div>
                                <button
                                    onClick={() => setPreviewInvoice(null)}
                                    className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
                                >
                                    <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">close</span>
                                </button>
                            </div>

                            {/* A4 Document Container */}
                            <div className="mx-auto w-full max-w-[800px] aspect-[1/1.414] bg-white text-slate-900 rounded-lg shadow-xl shadow-[#13ec37]/5 border border-[#13ec37]/10 overflow-hidden flex flex-col p-8 lg:p-12 mb-8">
                                {/* Invoice Header */}
                                <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-3xl text-[#13ec37]">bolt</span>
                                            <span className="text-2xl font-black tracking-tight text-slate-800">AutomatXpress</span>
                                        </div>
                                        <div className="text-sm text-slate-500 leading-relaxed">
                                            123 Tech Boulevard<br />
                                            Silicon District, SD 90210<br />
                                            support@automatxpress.com<br />
                                            +91 98765 43210
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-4xl font-light text-slate-300 mb-4 tracking-widest uppercase">Invoice</h2>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-right">
                                            <span className="text-slate-500 font-medium">Invoice No:</span>
                                            <span className="font-bold text-slate-800">{previewInvoice.invoice_number}</span>
                                            <span className="text-slate-500 font-medium">Date:</span>
                                            <span className="text-slate-800">{formatDate(previewInvoice.created_at)}</span>
                                            <span className="text-slate-500 font-medium">Status:</span>
                                            <span className="text-slate-800">{previewInvoice.status.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Billed To */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
                                    <div className="text-sm text-slate-700 leading-relaxed">
                                        <span className="font-bold text-slate-900 text-base block mb-1">{previewInvoice.customer_name}</span>
                                        {previewInvoice.customer_phone && <>{previewInvoice.customer_phone}<br /></>}
                                        {previewInvoice.customer_email && <>{previewInvoice.customer_email}</>}
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="border-b-2 border-slate-800">
                                                <th className="py-3 font-bold text-slate-800 uppercase tracking-wider text-xs">Description</th>
                                                <th className="py-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-center w-20">Qty</th>
                                                <th className="py-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right w-24">Unit Price</th>
                                                <th className="py-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right w-20">GST</th>
                                                <th className="py-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right w-28">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-700">
                                            {previewInvoice.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-100">
                                                    <td className="py-4">
                                                        <div className="font-medium text-slate-900">{item.product_name}</div>
                                                        {item.order_number && (
                                                            <div className="text-xs text-slate-500 mt-1">Order: {item.order_number}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 text-center">{item.quantity}</td>
                                                    <td className="py-4 text-right">{formatCurrency(item.unit_price)}</td>
                                                    <td className="py-4 text-right">18%</td>
                                                    <td className="py-4 text-right font-medium text-slate-900">{formatCurrency(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end pt-6 border-t border-slate-200 mt-6 pb-12">
                                    <div className="w-72">
                                        <div className="flex justify-between py-2 text-sm text-slate-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium text-slate-900">{formatCurrency(previewInvoice.subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-sm text-slate-600">
                                            <span>Total GST (18%)</span>
                                            <span className="font-medium text-slate-900">{formatCurrency(previewInvoice.tax_amount)}</span>
                                        </div>
                                        <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-800 text-lg font-bold text-slate-900">
                                            <span>Grand Total</span>
                                            <span>{formatCurrency(previewInvoice.total_amount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer / Terms */}
                                <div className="mt-auto text-xs text-slate-400 border-t border-slate-100 pt-6 pb-6">
                                    <p className="font-bold text-slate-500 mb-1">Terms &amp; Conditions</p>
                                    <p>Payment is due within 14 days. This is a computer-generated invoice and does not require a signature.</p>
                                </div>
                            </div>
                        </section>

                        {/* Right Panel: Actions & Settings */}
                        <aside className="w-[380px] shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 hidden lg:flex">
                                <span className="font-bold text-slate-900 dark:text-white">Options</span>
                                <button
                                    onClick={() => setPreviewInvoice(null)}
                                    className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <span className="material-symbols-outlined text-[#13ec37]">send</span>
                                    Actions
                                </h3>
                                <div className="space-y-3">
                                    <button className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold transition-colors shadow-sm">
                                        <span className="material-symbols-outlined">chat</span>
                                        Send via WhatsApp
                                    </button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="flex items-center justify-center gap-2 h-10 rounded-lg border border-[#13ec37]/30 bg-[#13ec37]/5 hover:bg-[#13ec37]/10 text-slate-900 dark:text-white font-medium transition-colors">
                                            <span className="material-symbols-outlined text-lg">download</span>
                                            Download
                                        </button>
                                        <button className="flex items-center justify-center gap-2 h-10 rounded-lg border border-[#13ec37]/30 bg-[#13ec37]/5 hover:bg-[#13ec37]/10 text-slate-900 dark:text-white font-medium transition-colors">
                                            <span className="material-symbols-outlined text-lg">print</span>
                                            Print
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 flex-1 bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <span className="material-symbols-outlined text-[#13ec37]">settings</span>
                                    Invoice Settings
                                </h3>
                                <div className="space-y-6">
                                    {/* Toggle 1 */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Show GST Breakdown</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Display tax details per item</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input defaultChecked className="sr-only peer" type="checkbox" />
                                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#13ec37]"></div>
                                        </label>
                                    </div>
                                    {/* Toggle 2 */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Include Store Terms</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Show payment instructions</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input defaultChecked className="sr-only peer" type="checkbox" />
                                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#13ec37]"></div>
                                        </label>
                                    </div>
                                    {/* Currency Select */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <label className="block font-medium text-slate-900 dark:text-slate-100 mb-2 text-sm">Currency</label>
                                        <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg focus:ring-[#13ec37] focus:border-[#13ec37] block w-full p-2.5 outline-none">
                                            <option>INR (₹)</option>
                                            <option>USD ($)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
}
