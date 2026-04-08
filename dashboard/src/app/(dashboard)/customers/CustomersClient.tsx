"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { CustomerWithChats, Conversation } from "@/types/customers";
import { toast } from "sonner";

interface CustomersClientProps {
    initialCustomers: CustomerWithChats[];
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const [customers, setCustomers] = useState<CustomerWithChats[]>(initialCustomers);
    const [activeCustomerId, setActiveCustomerId] = useState<string | null>(initialCustomers[0]?.id || null);
    const [filter, setFilter] = useState<'all' | 'override'>('all');
    const [replyText, setReplyText] = useState("");
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeCustomerId) {
            scrollToBottom();
        }
    }, [activeCustomerId, customers]);

    // Real-time subscription to conversations
    useEffect(() => {
        const channel = supabase
            .channel('public:conversations')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'conversations' },
                (payload) => {
                    const newMsg = payload.new as Conversation;
                    setCustomers(prev => prev.map(c => {
                        if (c.id === newMsg.customer_id) {
                            // Check if message already exists (from optimistic updates)
                            const exists = c.conversations.some(msg => msg.id === newMsg.id);
                            if (!exists) {
                                return {
                                    ...c,
                                    conversations: [...c.conversations, newMsg]
                                };
                            }
                        }
                        return c;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const activeCustomer = customers.find(c => c.id === activeCustomerId);

    const filteredCustomers = customers.filter(c => {
        if (filter === 'override') {
            return c.conversations.some(chat => chat.is_human_override);
        }
        return true;
    });

    const humanOverrideCount = customers.filter(c => c.conversations.some(chat => chat.is_human_override)).length;

    // Format relative time helper
    const formatTime = (isoString?: string) => {
        if (!isoString) return "Just now";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const toggleHumanOverride = async (customerId: string, override: boolean) => {
        const { error } = await supabase
            .from('conversations')
            .update({ is_human_override: override })
            .eq('customer_id', customerId);

        if (error) {
            toast.error("Failed to update control status");
            console.error(error);
            return;
        }

        toast.success(override ? "You have taken control" : "Handed back to AI");

        // Optimistic UI Update
        setCustomers(prev => prev.map(c => {
            if (c.id === customerId) {
                return {
                    ...c,
                    conversations: c.conversations.map(chat => ({ ...chat, is_human_override: override }))
                };
            }
            return c;
        }));
    };

    const sendMessage = async () => {
        if (!replyText.trim() || !activeCustomer) return;
        const textToUse = replyText;
        setReplyText("");

        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: activeCustomer.client_id,
                    customerId: activeCustomer.id,
                    customerPhone: activeCustomer.phone_number,
                    text: textToUse
                })
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "Failed to send message!");
                console.error(result);
                setReplyText(textToUse);
                return;
            }

            const newMsg = result.message as Conversation;

            // Optimistic Update
            setCustomers(prev => prev.map(c => {
                if (c.id === activeCustomer.id) {
                    const exists = c.conversations.some(m => m.id === newMsg.id);
                    if (!exists) {
                        return {
                            ...c,
                            conversations: [...c.conversations, newMsg]
                        };
                    }
                }
                return c;
            }));
            
            // Re-trigger scroll when sending
            setTimeout(scrollToBottom, 50);

        } catch (error) {
            toast.error("Network error while sending message");
            console.error(error);
            setReplyText(textToUse);
        }
    };

    return (
        <div className="flex w-full -m-4 lg:-m-6 h-[calc(100vh-64px)] overflow-hidden bg-background-light dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            {/* Left Sidebar: Customer List */}
            <div className="w-[320px] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <label className="flex flex-col w-full h-10">
                        <div className="flex w-full flex-1 items-stretch rounded-full h-full bg-slate-100 dark:bg-slate-800 border border-transparent focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <div className="text-slate-500 flex items-center justify-center pl-4 rounded-l-full">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-slate-900 dark:text-slate-100 bg-transparent border-none focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 text-sm font-normal"
                                placeholder="Search customers..."
                            />
                        </div>
                    </label>
                </div>

                {/* Tabs */}
                <div className="flex px-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto hide-scrollbar shrink-0">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex items-center justify-center border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${filter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <span className="text-sm font-semibold">All</span>
                    </button>
                    <button
                        onClick={() => setFilter('override')}
                        className={`flex items-center justify-center border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${filter === 'override' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <span className="text-sm font-semibold">Human Override</span>
                        {humanOverrideCount > 0 && (
                            <span className={`ml-2 py-0.5 px-2 rounded-full text-[10px] font-bold ${filter === 'override' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : 'bg-slate-100 text-slate-500'}`}>
                                {humanOverrideCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredCustomers.map(customer => {
                        const isOverride = customer.conversations.some(chat => chat.is_human_override);
                        const isSelected = activeCustomerId === customer.id;
                        const lastMessage = customer.conversations[customer.conversations.length - 1];

                        return (
                            <div
                                key={customer.id}
                                onClick={() => {
                                    setActiveCustomerId(customer.id);
                                    setIsProfileOpen(false); // Close profile drawer when switching customers
                                }}
                                className={`flex flex-col gap-1 px-4 py-3 cursor-pointer transition-colors border-b ${isOverride
                                    ? 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10 border-b-orange-100 dark:border-b-orange-900/20 hover:bg-orange-100/50'
                                    : 'border-l-4 border-transparent border-b-slate-100 dark:border-b-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'
                                    } ${isSelected && !isOverride ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div
                                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-slate-200 dark:bg-slate-700"
                                                style={{ backgroundImage: `url(${customer.profile_picture_url || ''})` }}
                                            />
                                            {!isOverride && (
                                                <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border border-white dark:border-slate-900" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">{customer.name || customer.phone_number}</p>
                                            {isOverride ? (
                                                <span className="inline-block mt-0.5 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wider uppercase">
                                                    You Have Control
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="material-symbols-outlined text-[12px] text-green-500">smart_toy</span>
                                                    <span className="text-slate-500 text-xs font-medium">AI Active</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {formatTime(lastMessage?.created_at || customer.last_active)}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm truncate mt-1 pl-[52px]">
                                    {lastMessage?.text_body || "No recent messages"}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Center Panel: Active Chat */}
            {activeCustomer ? (
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
                        <div 
                            className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 -ml-2 rounded-lg transition-colors"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div
                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 shadow-sm bg-slate-200 dark:bg-slate-700"
                                style={{ backgroundImage: `url(${activeCustomer.profile_picture_url || ''})` }}
                            />
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {activeCustomer.name || activeCustomer.phone_number}
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                                        {isProfileOpen ? 'expand_less' : 'expand_more'}
                                    </span>
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex size-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-sm text-slate-500">Online</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {activeCustomer.conversations.some(c => c.is_human_override) ? (
                                <>
                                    <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-full flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">engineering</span>
                                        <span className="text-sm font-bold">You are in control</span>
                                    </div>
                                    <button
                                        onClick={() => toggleHumanOverride(activeCustomer.id, false)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                                        Hand back to AI
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => toggleHumanOverride(activeCustomer.id, true)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">engineering</span>
                                    Take Control
                                </button>
                            )}
                            
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                            
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`p-2 rounded-lg transition-colors hidden sm:flex ${isProfileOpen ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                title="Toggle Customer Details"
                            >
                                <span className="material-symbols-outlined">
                                    {isProfileOpen ? 'info' : 'info_i'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                        {activeCustomer.conversations.map((chat, idx) => {
                            const isIncoming = chat.direction === 'inbound';
                            const isBot = !isIncoming && !chat.is_human_override;
                            const isStaff = !isIncoming && chat.is_human_override;

                            if (isIncoming) {
                                return (
                                    <div key={chat.id || idx} className="flex items-start gap-3">
                                        <div
                                            className="size-8 rounded-full bg-center bg-no-repeat bg-cover shrink-0 shadow-sm bg-slate-200 dark:bg-slate-700"
                                            style={{ backgroundImage: `url(${activeCustomer.profile_picture_url || ''})` }}
                                        />
                                        <div className="flex flex-col gap-1 items-start max-w-[70%]">
                                            <span className="text-xs text-slate-500 ml-1">
                                                {activeCustomer.name || activeCustomer.phone_number} • {formatTime(chat.created_at)}
                                            </span>
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm">
                                                {chat.text_body}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (isBot) {
                                return (
                                    <div key={chat.id || idx} className="flex items-start gap-3 flex-row-reverse self-end">
                                        <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end max-w-[70%]">
                                            <span className="text-xs text-slate-500 mr-1">AutomatXpress AI • {formatTime(chat.created_at)}</span>
                                            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-2xl rounded-tr-sm shadow-sm text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 text-sm">
                                                {chat.text_body}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (isStaff) {
                                return (
                                    <div key={chat.id || idx} className="flex items-start gap-3 flex-row-reverse self-end">
                                        <div className="size-8 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">support_agent</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end max-w-[70%]">
                                            <span className="text-xs text-slate-500 mr-1">You • {formatTime(chat.created_at)}</span>
                                            <div className="bg-primary p-3 rounded-2xl rounded-tr-sm shadow-sm text-white text-sm">
                                                {chat.text_body}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Compose Area */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative shrink-0">
                        {activeCustomer.conversations.some(c => c.is_human_override) && (
                            <div className="absolute -top-3 left-6 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide shadow-sm">
                                STAFF MODE ACTIVE
                            </div>
                        )}
                        <div className={`flex items-end gap-3 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl p-2 transition-all ${activeCustomer.conversations.some(c => c.is_human_override)
                            ? 'border-orange-400/50 dark:border-orange-500/50 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20'
                            : 'border-slate-200 dark:border-slate-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
                            }`}>
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                                <span className="material-symbols-outlined">attach_file</span>
                            </button>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none text-slate-900 dark:text-slate-100 text-sm py-3 px-2 placeholder:text-slate-400"
                                placeholder={activeCustomer.conversations.some(c => c.is_human_override) ? "Type a message to the customer... (Press Enter to Send)" : "Take control to reply manually..."}
                                rows={1}
                                disabled={!activeCustomer.conversations.some(c => c.is_human_override)}
                            />
                            <div className="flex gap-2 shrink-0 pb-1 pr-1">
                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors hidden sm:block">
                                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                                </button>
                                <button
                                    onClick={sendMessage}
                                    className={`${activeCustomer.conversations.some(c => c.is_human_override) ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'} text-white p-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center`}
                                    disabled={!activeCustomer.conversations.some(c => c.is_human_override) || !replyText.trim()}
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-slate-400">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">forum</span>
                    <p className="text-lg font-medium text-slate-500">Select a customer to view chats</p>
                </div>
            )}

            {/* Right Sidebar: Profile */}
            {activeCustomer && isProfileOpen && (
                <div className="w-[300px] flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-y-auto w-full max-w-[300px] animate-in slide-in-from-right-10 duration-200">
                    <div className="p-6 flex flex-col items-center border-b border-slate-200 dark:border-slate-800 relative">
                        <button 
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-24 mb-4 shadow-sm bg-slate-200 dark:bg-slate-700"
                            style={{ backgroundImage: `url(${activeCustomer.profile_picture_url || ''})` }}
                        />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{activeCustomer.name || "Unknown"}</h3>
                        <p className="text-sm text-slate-500 mb-4">{activeCustomer.phone_number}</p>

                        <div className="flex gap-2 w-full">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors">
                                <span className="material-symbols-outlined text-[18px]">call</span>
                                Call
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors">
                                <span className="material-symbols-outlined text-[18px]">mail</span>
                                Email
                            </button>
                        </div>
                    </div>

                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Customer Metrics</h4>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 flex flex-col gap-1">
                            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Total Spend</span>
                            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                                ₹{(activeCustomer.total_spend || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs text-slate-500">Total Orders</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{activeCustomer.total_orders || 0}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs text-slate-500">Avg. Order</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    ₹{activeCustomer.total_orders > 0 ? (activeCustomer.total_spend / activeCustomer.total_orders).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Recent Orders</h4>
                        <div className="flex flex-col gap-4">
                            {/* Dummy Order Items for UI completeness */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-primary">
                                        <span className="material-symbols-outlined">inventory_2</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">#AX-8923</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Processing • ₹14,500</p>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400">Today</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                                        <span className="material-symbols-outlined">check_circle</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">#AX-8104</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Delivered • ₹8,200</p>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400">Oct 12</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            View All Orders
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
