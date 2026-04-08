'use client';

import { useState } from 'react';

type SettingsTab =
    | 'store'
    | 'bot'
    | 'whatsapp'
    | 'staff'
    | 'roles'
    | 'subscription';

// ─── Sub-Tab Content Components ──────────────────────────────────────────────

function StoreDetailsTab() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">Store Details</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your business profile and contact information.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-name">Store Name</label>
                        <input id="store-name" type="text" defaultValue="Karol Bagh Electronics" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-email">Email Address</label>
                        <input id="store-email" type="email" defaultValue="admin@karolbaghelectronics.com" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-phone">Phone Number</label>
                        <input id="store-phone" type="text" defaultValue="+91 98765 43210" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-gstin">GSTIN</label>
                        <input id="store-gstin" type="text" defaultValue="07AABCU9603R1ZK" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <p className="text-xs text-muted-foreground mt-1">Used on invoices and legal documents.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-address">Business Address</label>
                        <textarea id="store-address" rows={4} defaultValue="Shop 42, Ajmal Khan Rd, Karol Bagh, New Delhi - 110005" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Store Logo</label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                            <span className="material-icons text-4xl text-muted-foreground mb-2 block">cloud_upload</span>
                            <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="store-timezone">Timezone</label>
                        <select id="store-timezone" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                            <option>Asia/Kolkata (IST, UTC+5:30)</option>
                            <option>Asia/Dubai (GST, UTC+4:00)</option>
                            <option>Europe/London (GMT, UTC+0:00)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
                <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                    <span className="material-icons text-[18px]">save</span>
                    Save Store Details
                </button>
            </div>
        </div>
    );
}

function BotConfigTab() {
    const [imei, setImei] = useState(true);
    const [aadhaar, setAadhaar] = useState(false);
    const [softNudge, setSoftNudge] = useState(true);
    const [waitlistNotif, setWaitlistNotif] = useState(true);
    const [multiLang, setMultiLang] = useState(true);

    const Toggle = ({ id, value, onChange }: { id: string; value: boolean; onChange: (v: boolean) => void }) => (
        <button
            id={id}
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 ${value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Bot & Inventory Settings</h2>
                    <p className="text-sm text-muted-foreground mt-1">Configure automated behaviours and stock alert thresholds.</p>
                </div>
                <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                    <span className="material-icons text-[18px]">save</span>
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bot Behaviour Card */}
                <div className="bg-secondary/30 rounded-xl p-5 border border-border">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                        <span className="material-icons text-primary">smart_toy</span>
                        <h3 className="text-base font-semibold text-foreground">Bot Behaviour</h3>
                    </div>
                    <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-sm text-foreground">Require IMEI Verification</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Ask for IMEI before processing exchanges or warranty claims.</p>
                            </div>
                            <Toggle id="toggle-imei" value={imei} onChange={setImei} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-sm text-foreground">Aadhaar for High-Value Items</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Prompt for Aadhaar details on purchases above ₹50,000.</p>
                            </div>
                            <Toggle id="toggle-aadhaar" value={aadhaar} onChange={setAadhaar} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-sm text-foreground">Soft Nudge / Persuasion</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Enable ethical sales psychology in AI responses.</p>
                            </div>
                            <Toggle id="toggle-nudge" value={softNudge} onChange={setSoftNudge} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-sm text-foreground">Waitlist Notifications</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Auto-notify next customer when reserved item is released.</p>
                            </div>
                            <Toggle id="toggle-waitlist" value={waitlistNotif} onChange={setWaitlistNotif} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-sm text-foreground">Multi-Language (Hinglish)</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Allow bot to respond in Hindi + English mix.</p>
                            </div>
                            <Toggle id="toggle-lang" value={multiLang} onChange={setMultiLang} />
                        </div>
                        <div className="pt-4 border-t border-border">
                            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="bot-greeting">Custom Bot Greeting Message</label>
                            <textarea
                                id="bot-greeting"
                                rows={3}
                                defaultValue="Welcome to Karol Bagh Electronics! I'm your virtual assistant. How can I help you find the perfect gadget today?"
                                className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground focus:ring-primary focus:border-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Sent to new customers initiating a chat.</p>
                        </div>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-secondary/30 rounded-xl p-5 border border-border">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                        <span className="material-icons text-orange-500">warning</span>
                        <h3 className="text-base font-semibold text-foreground">Low Stock Alerts</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Set thresholds per category for dashboard notifications.</p>
                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium w-28">Alert At (qty)</th>
                                    <th className="px-4 py-3 font-medium text-center w-20">Enabled</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {[
                                    { name: 'Smartphones', val: 5, on: true },
                                    { name: 'Laptops', val: 3, on: true },
                                    { name: 'Audio & Headphones', val: 10, on: true },
                                    { name: 'Accessories', val: 15, on: false },
                                    { name: 'Tablets', val: 5, on: true },
                                ].map((cat) => (
                                    <tr key={cat.name} className="bg-card hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                defaultValue={cat.val}
                                                className="w-20 px-2 py-1 text-center bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cat.on ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cat.on ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                {cat.on ? 'On' : 'Off'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Reservation Timeout (minutes)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" defaultValue={15} className="w-20 px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                <span className="text-sm text-muted-foreground">minutes after which cart is auto-released</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WhatsAppTab() {
    const [connected] = useState(true);
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">WhatsApp Integration</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your YCloud connection and webhook configuration.</p>
            </div>

            {/* Connection Status Card */}
            <div className={`rounded-xl p-5 border flex items-center gap-4 ${connected ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${connected ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                    <span className={`material-icons text-xl ${connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {connected ? 'check_circle' : 'error'}
                    </span>
                </div>
                <div className="flex-1">
                    <p className={`font-semibold text-sm ${connected ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                        {connected ? 'WhatsApp Connected via YCloud' : 'Not Connected'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Business Number: +91 98765 43210 • Last synced: Just now</p>
                </div>
                <button className={`text-xs font-medium py-1.5 px-3 rounded-lg border transition-colors ${connected ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'}`}>
                    {connected ? 'Reconnect' : 'Connect Now'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="ycloud-key">YCloud API Key</label>
                        <div className="flex gap-2">
                            <input id="ycloud-key" type="password" defaultValue="sk_live_xxxxxxxxxxxxxxxxxxxxxx" className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            <button className="px-3 py-2 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <span className="material-icons text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Found in your YCloud dashboard under API Settings.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="phone-number-id">Phone Number ID</label>
                        <input id="phone-number-id" type="text" defaultValue="9876543210" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Incoming Webhook URL</label>
                        <div className="flex gap-2">
                            <input type="text" readOnly value="https://api.automatxpress.com/webhook/whatsapp" className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono select-all cursor-copy" />
                            <button className="px-3 py-2 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                                <span className="material-icons text-[18px]">content_copy</span>
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Paste this URL into YCloud → Webhooks → Incoming.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Webhook Secret (HMAC)</label>
                        <div className="flex gap-2">
                            <input type="password" defaultValue="whsec_xxxxxxxxxxxxxxxx" className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            <button className="px-3 py-2 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <span className="material-icons text-[18px]">refresh</span>
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Rotating this will invalidate existing signatures.</p>
                    </div>
                </div>
            </div>

            <div className="bg-secondary/30 rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="material-icons text-[18px] text-primary">notifications</span>
                    Notification Events
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: 'New Order Received', on: true },
                        { label: 'Reservation Timeout', on: true },
                        { label: 'Payment Confirmed', on: true },
                        { label: 'Low Stock Alert', on: false },
                        { label: 'Customer Waitlist Update', on: true },
                        { label: 'Bot Error / Fallback', on: false },
                    ].map((ev) => (
                        <label key={ev.label} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" defaultChecked={ev.on} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50" />
                            <span className="text-sm text-foreground group-hover:text-primary transition-colors">{ev.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
                <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                    <span className="material-icons text-[18px]">save</span>
                    Save Integration Settings
                </button>
            </div>
        </div>
    );
}

const staffMembers = [
    { name: 'Admin User', email: 'admin@karolbaghelectronics.com', role: 'Owner', lastActive: 'Just now', status: 'active', initials: 'A', color: 'bg-blue-100 text-blue-600' },
    { name: 'Rahul Sharma', email: 'rahul@karolbaghelectronics.com', role: 'Manager', lastActive: '2 hours ago', status: 'active', initials: 'R', color: 'bg-purple-100 text-purple-600' },
    { name: 'Priya Patel', email: 'priya@karolbaghelectronics.com', role: 'Sales Agent', lastActive: 'Yesterday', status: 'offline', initials: 'P', color: 'bg-orange-100 text-orange-600' },
    { name: 'Vikram Singh', email: 'vikram@karolbaghelectronics.com', role: 'Support', lastActive: '-', status: 'pending', initials: 'V', color: 'bg-gray-100 text-gray-600' },
];

const statusConfig: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
    active: { label: 'Active', dotColor: 'bg-green-500', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    offline: { label: 'Offline', dotColor: 'bg-gray-400', badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    pending: { label: 'Pending', dotColor: 'bg-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

function StaffMembersTab() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Staff Members</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage who has access to your store dashboard.</p>
                </div>
                <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                    <span className="material-icons text-[18px]">person_add</span>
                    Invite Staff Member
                </button>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold">Last Active</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {staffMembers.map((member) => {
                            const s = statusConfig[member.status];
                            return (
                                <tr key={member.email} className="hover:bg-secondary/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full ${member.color} flex items-center justify-center font-bold text-sm shrink-0`}>{member.initials}</div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-foreground">{member.role}</td>
                                    <td className="p-4 text-sm text-muted-foreground">{member.lastActive}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.badgeClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`}></span>
                                            {s.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {member.role !== 'Owner' && (
                                                <>
                                                    <button className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary transition-colors" title="Edit">
                                                        <span className="material-icons text-[18px]">edit</span>
                                                    </button>
                                                    <button className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove">
                                                        <span className="material-icons text-[18px]">person_remove</span>
                                                    </button>
                                                </>
                                            )}
                                            {member.role === 'Owner' && (
                                                <span className="text-xs text-muted-foreground px-2">You</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const roles = [
    {
        name: 'Owner',
        description: 'Full access to all features and settings.',
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
        icon: 'shield',
        permissions: ['View Dashboard', 'Manage Orders', 'Manage Products', 'Manage Customers', 'View Analytics', 'Manage Staff', 'Change Billing', 'Bot Settings', 'Human Override'],
    },
    {
        name: 'Manager',
        description: 'Can manage day-to-day operations.',
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
        icon: 'manage_accounts',
        permissions: ['View Dashboard', 'Manage Orders', 'Manage Products', 'Manage Customers', 'View Analytics', 'Human Override'],
    },
    {
        name: 'Sales Agent',
        description: 'Can view orders and assist customers.',
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
        icon: 'sell',
        permissions: ['View Dashboard', 'View Orders', 'Manage Customers', 'Human Override'],
    },
    {
        name: 'Support',
        description: 'Customer support and human override only.',
        color: 'text-green-600 bg-green-50 dark:bg-green-900/30',
        icon: 'support_agent',
        permissions: ['View Dashboard', 'View Customers', 'Human Override'],
    },
];

const allPermissions = ['View Dashboard', 'View Orders', 'Manage Orders', 'Manage Products', 'Manage Customers', 'View Customers', 'View Analytics', 'Manage Staff', 'Change Billing', 'Bot Settings', 'Human Override'];

function RolesTab() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
                <p className="text-sm text-muted-foreground mt-1">Define what each staff role can access within the dashboard.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-secondary/50 border-b border-border">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Permission</th>
                            {roles.map((role) => (
                                <th key={role.name} className="px-4 py-3 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                                        <span className="material-icons text-[14px]">{role.icon}</span>
                                        {role.name}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {allPermissions.map((perm) => (
                            <tr key={perm} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-5 py-3 font-medium text-foreground">{perm}</td>
                                {roles.map((role) => (
                                    <td key={role.name} className="px-4 py-3 text-center">
                                        {role.permissions.includes(perm) ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                                                <span className="material-icons text-green-600 dark:text-green-400 text-[14px]">check</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800">
                                                <span className="material-icons text-gray-400 text-[14px]">remove</span>
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">Role permissions are predefined. Contact support to request custom role configurations.</p>
        </div>
    );
}

function SubscriptionTab() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">Subscription</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your plan, usage, and billing preferences.</p>
            </div>

            {/* Current plan */}
            <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 dark:from-primary/20 dark:to-blue-900/10 rounded-xl p-6 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-foreground">Growth Plan</span>
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">Current</span>
                    </div>
                    <p className="text-sm text-muted-foreground">₹4,999 / month • Renews on April 1, 2026</p>
                </div>
                <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-sm shrink-0">
                    Upgrade to Business
                </button>
            </div>

            {/* Usage meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'WhatsApp Messages', used: 7420, limit: 10000, color: 'bg-primary' },
                    { label: 'Staff Seats', used: 4, limit: 5, color: 'bg-purple-500' },
                    { label: 'API Calls', used: 42800, limit: 100000, color: 'bg-orange-500' },
                ].map((meter) => {
                    const pct = Math.round((meter.used / meter.limit) * 100);
                    return (
                        <div key={meter.label} className="bg-card border border-border rounded-xl p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium text-foreground">{meter.label}</span>
                                <span className="text-muted-foreground">{meter.used.toLocaleString()} / {meter.limit.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div className={`${meter.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">{pct}% used</p>
                        </div>
                    );
                })}
            </div>

            {/* Plan Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { name: 'Starter', price: '₹1,999', messages: '3,000', seats: '2', current: false },
                    { name: 'Growth', price: '₹4,999', messages: '10,000', seats: '5', current: true },
                    { name: 'Business', price: '₹12,999', messages: 'Unlimited', seats: '20', current: false },
                ].map((plan) => (
                    <div key={plan.name} className={`rounded-xl p-5 border-2 flex flex-col ${plan.current ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border bg-card'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-foreground">{plan.name}</h3>
                            {plan.current && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <p className="text-2xl font-bold text-foreground mb-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        <ul className="space-y-2 mt-4 flex-1">
                            <li className="text-sm text-muted-foreground flex items-center gap-2"><span className="material-icons text-green-500 text-[16px]">check_circle</span>{plan.messages} messages/mo</li>
                            <li className="text-sm text-muted-foreground flex items-center gap-2"><span className="material-icons text-green-500 text-[16px]">check_circle</span>{plan.seats} staff seats</li>
                            <li className="text-sm text-muted-foreground flex items-center gap-2"><span className="material-icons text-green-500 text-[16px]">check_circle</span>Bot + Analytics</li>
                        </ul>
                        <button className={`mt-5 w-full py-2 rounded-lg text-sm font-medium transition-colors ${plan.current ? 'bg-primary text-primary-foreground opacity-60 cursor-default' : 'bg-secondary border border-border text-foreground hover:bg-primary/10'}`} disabled={plan.current}>
                            {plan.current ? 'Current Plan' : 'Switch Plan'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

const navGroups = [
    {
        label: 'General',
        items: [
            { id: 'store' as SettingsTab, label: 'Store Details', icon: 'store' },
            { id: 'bot' as SettingsTab, label: 'Bot Configuration', icon: 'smart_toy' },
            { id: 'whatsapp' as SettingsTab, label: 'WhatsApp Integration', icon: 'chat' },
        ],
    },
    {
        label: 'Team',
        items: [
            { id: 'staff' as SettingsTab, label: 'Staff Members', icon: 'group' },
            { id: 'roles' as SettingsTab, label: 'Roles & Permissions', icon: 'shield' },
        ],
    },
    {
        label: 'Billing',
        items: [
            { id: 'subscription' as SettingsTab, label: 'Subscription', icon: 'credit_card' },
        ],
    },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsClient() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('store');

    const renderContent = () => {
        switch (activeTab) {
            case 'store': return <StoreDetailsTab />;
            case 'bot': return <BotConfigTab />;
            case 'whatsapp': return <WhatsAppTab />;
            case 'staff': return <StaffMembersTab />;
            case 'roles': return <RolesTab />;
            case 'subscription': return <SubscriptionTab />;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left Settings Nav Panel */}
            <div className="w-full lg:w-60 shrink-0 flex flex-col gap-1">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-3">{group.label}</h3>
                        {group.items.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-left ${isActive
                                        ? 'bg-primary/10 text-primary border-l-4 border-primary'
                                        : 'text-foreground hover:bg-secondary border-l-4 border-transparent'
                                        }`}
                                >
                                    <span className={`material-icons mr-3 text-[20px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.icon}</span>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Right Content Panel */}
            <div className="flex-1 bg-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
