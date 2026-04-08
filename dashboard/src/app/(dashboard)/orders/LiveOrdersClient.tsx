'use client';

import { useState } from 'react';
import type { PendingOrder, OrderStatus } from '@/types/orders';

export default function LiveOrdersClient({ initialOrders }: { initialOrders: PendingOrder[] }) {
    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
    const [filter, setFilter] = useState<'all' | 'payment_pending' | 'discount_requested' | 'completed' | 'expired'>('all');

    // Time remaining helper
    const getRemainingTime = (expiresAt: string) => {
        const remainingMs = new Date(expiresAt).getTime() - Date.now();
        if (remainingMs <= 0) return 'Expired';
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const statusConfig: Record<OrderStatus, { label: string, badgeClass: string, rowClass: string }> = {
        pending_payment: {
            label: 'ACTIVE RESERVATION',
            // We will default to the standard grey/blue for active in this map, but use specific colors based on UI.
            badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
            rowClass: 'border-l-4 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
        },
        payment_initiated: {
            label: 'PAYMENT INITIATED',
            badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
            rowClass: 'border-l-4 border-green-500'
        },
        failed: {
            label: 'PAYMENT FAILED',
            badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
            rowClass: 'border-l-4 border-red-500'
        },
        paid: {
            label: 'COMPLETED',
            badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
            rowClass: ''
        },
        expired: {
            label: 'EXPIRED',
            badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
            rowClass: 'opacity-60'
        },
        fraud_suspected: {
            label: 'FRAUD ALERT',
            badgeClass: 'bg-red-500 text-white font-bold animate-pulse',
            rowClass: 'border-l-4 border-red-600 bg-red-50/50'
        }
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-row">
            {/* Left side: Main ListView */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6">
                {/* Filters Top Bar */}
                <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                    <button
                        onClick={() => setFilter('all')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors
            ${filter === 'all' ? 'bg-primary text-white shadow-sm border border-primary' : 'bg-card text-muted-foreground border border-border hover:bg-secondary'}`}>
                        Active Reservations ({initialOrders.filter(o => o.status === 'pending_payment' || o.status === 'payment_initiated').length || 0})
                    </button>

                    <button
                        onClick={() => setFilter('payment_pending')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${filter === 'payment_pending' ? 'bg-green-600 text-white shadow-sm' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/50'}`}>
                        Payment Initiated ({initialOrders.filter(o => o.status === 'payment_initiated').length || 0})
                    </button>

                    <button
                        onClick={() => setFilter('discount_requested')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${filter === 'discount_requested' ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/50'}`}>
                        Discount Requests (0)
                    </button>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border flex-1 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Product</th>
                                    <th className="p-4">Reserved At</th>
                                    <th className="p-4">Countdown</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {initialOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            No active orders found in the database today. Wait for the Whatsapp bot to reserve an item!
                                        </td>
                                    </tr>
                                )}
                                {initialOrders.map(order => {
                                    const sConf = statusConfig[order.status] || statusConfig['pending_payment'];
                                    const isSelected = selectedOrder?.id === order.id;

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`hover:bg-secondary/50 transition-colors group cursor-pointer ${sConf.rowClass} ${isSelected ? 'bg-secondary/80 dark:bg-secondary/80' : ''}`}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-foreground">{order.customer_name || 'Anonymous User'}</div>
                                                    <a onClick={(e) => e.stopPropagation()} href={`https://wa.me/${order.customer_phone?.replace('+', '')}`} className="text-green-500 hover:scale-110 transition-transform flex items-center" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.747-2.874-2.512-2.96-2.626-.087-.115-.708-.941-.708-1.793 0-.852.449-1.27.608-1.441.159-.171.348-.215.463-.215.115 0 .231.001.332.006.106.005.249-.04.391.3.144.348.491 1.196.535 1.284.044.088.073.19.014.306-.059.115-.088.19-.174.288-.088.101-.185.225-.264.302-.088.087-.18.181-.077.357.103.175.458.756.983 1.225.677.604 1.246.791 1.42.878.174.087.275.073.377-.043.101-.116.435-.506.551-.679.116-.172.232-.144.391-.087.159.058 1.011.477 1.184.564.174.087.289.13.332.202.045.073.045.421-.099.826zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.017 19.539h-.012c-1.348 0-2.67-.364-3.824-1.053l-4.128 1.082 1.1-4.024c-.759-1.316-1.159-2.816-1.158-4.35 0-4.755 3.868-8.623 8.626-8.623 2.299 0 4.463.896 6.089 2.524 1.625 1.626 2.52 3.791 2.52 6.091 0 4.757-3.868 8.653-8.623 8.653z"></path></svg>
                                                    </a>
                                                </div>
                                                <div className="text-xs text-muted-foreground">{order.customer_phone || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-foreground">{order.product_name}</div>
                                                <div className="text-xs text-muted-foreground">ID: #{order.product_id}</div>
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                {new Date(order.reserved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                                                    <span className="material-icons text-[14px]">timer</span> {getRemainingTime(order.expires_at)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${sConf.badgeClass}`}>
                                                    {sConf.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="text-muted-foreground hover:text-primary p-1">
                                                    <span className="material-icons text-[20px]">more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right side: Selected Order Panel */}
            {selectedOrder && (
                <div className="w-80 bg-card border-l border-border flex flex-col h-full shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 overflow-y-auto animate-in slide-in-from-right-10 duration-200">
                    <div className="p-5 border-b border-border">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-semibold text-foreground">Order Details</h2>
                            <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                                <span className="material-icons text-[20px]">close</span>
                            </button>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                            Order ID: <span className="text-primary font-bold">#{selectedOrder.order_id || selectedOrder.id}</span>
                        </p>
                    </div>

                    <div className="flex-1 p-5 space-y-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                                    {selectedOrder.customer_name ? selectedOrder.customer_name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-foreground leading-tight">{selectedOrder.customer_name || 'Anonymous User'}</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                                </div>
                            </div>

                            <div className="bg-secondary/50 rounded-lg p-3 text-xs border border-border mt-4">
                                <div className="flex justify-between mb-1">
                                    <span className="text-muted-foreground">KYC Status</span>
                                    <span className={`font-medium ${selectedOrder.kyc_status === 'confirmed' ? 'text-green-500' : 'text-orange-500'}`}>
                                        {selectedOrder.kyc_status || 'not_started'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400 capitalize">{selectedOrder.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-5">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Product Info</h4>
                            <div className="flex gap-3 mb-3">
                                <div className="w-16 h-16 bg-secondary rounded-md border border-border flex items-center justify-center">
                                    <span className="material-icons text-muted-foreground text-3xl">inventory_2</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">{selectedOrder.product_name}</h3>
                                    <p className="text-sm font-bold text-foreground mt-1">₹{selectedOrder.payment_amount}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-5 pb-6">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timeline</h4>
                            <div className="relative border-l border-border ml-2 space-y-4">
                                <div className="relative pl-4">
                                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-background"></div>
                                    <p className="text-sm font-medium text-foreground">Item Reserved</p>
                                    <p className="text-xs text-muted-foreground">{new Date(selectedOrder.reserved_at).toLocaleTimeString()}</p>
                                </div>
                                {selectedOrder.status === 'payment_initiated' && (
                                    <div className="relative pl-4">
                                        <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                                        <p className="text-sm font-medium text-foreground">Payment Initiated</p>
                                        <p className="text-xs text-muted-foreground">Waiting for Cashfree hook...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-border bg-card/90 backdrop-blur-sm sticky bottom-0">
                        <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                            <span className="material-icons text-[20px]">check_circle</span>
                            Mark Fulfilled Manually
                        </button>
                        <button className="w-full mt-3 bg-secondary border border-border hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                            Cancel Reservation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
