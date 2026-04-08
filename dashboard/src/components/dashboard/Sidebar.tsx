'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
        { name: 'Live Orders', href: '/orders', icon: 'shopping_cart', badge: '3' },
        { name: 'Products', href: '/products', icon: 'inventory_2' },
        { name: 'Customers & Chats', href: '/customers', icon: 'people' },
        { name: 'Billing', href: '/billing', icon: 'receipt_long' },
        { name: 'Analytics', href: '/analytics', icon: 'analytics' },
    ];

    return (
        <aside className="w-20 lg:w-64 bg-[#1B2631] text-white flex flex-col transition-all duration-300 z-20 shrink-0 shadow-lg">
            <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-700">
                <span className="material-icons text-primary text-2xl lg:mr-2">smart_toy</span>
                <span className="font-bold text-lg tracking-wide hidden lg:block">AutomatXpress</span>
            </div>

            <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive
                                ? 'bg-[#2C3E50] text-white'
                                : 'text-gray-400 hover:bg-[#2C3E50] hover:text-white'
                                }`}
                        >
                            <span className="material-icons text-[20px] lg:mr-3">{item.icon}</span>
                            <span className="font-medium hidden lg:block">{item.name}</span>
                            {item.badge && (
                                <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full hidden lg:block">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <Link
                    href="/settings"
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${pathname === '/settings'
                        ? 'bg-[#2C3E50] text-white'
                        : 'bg-primary/20 text-primary hover:bg-[#2C3E50] hover:text-white'
                        }`}
                >
                    <span className="material-icons text-[20px] lg:mr-3">settings</span>
                    <span className="font-medium hidden lg:block">Settings</span>
                </Link>
            </div>
        </aside>
    );
}
