export default function DashboardOverview() {
    return (
        <div className="w-full flex-1 space-y-6 pb-6">
            <div className="flex items-center gap-4 mb-2">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block">Consolidated Analytics</h1>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</p>
                        <span className="material-symbols-outlined text-blue-500 text-[16px]">currency_rupee</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">₹1,42,500</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-[14px]">arrow_upward</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">12.5%</span>
                        <span className="text-[10px] text-slate-400">vs last week</span>
                    </div>
                </div>
                {/* Orders */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Orders</p>
                        <span className="material-symbols-outlined text-blue-500 text-[16px]">shopping_bag</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">342</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-[14px]">arrow_upward</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">8.2%</span>
                        <span className="text-[10px] text-slate-400">vs last week</span>
                    </div>
                </div>
                {/* Avg Order Value */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Order Value</p>
                        <span className="material-symbols-outlined text-blue-500 text-[16px]">receipt_long</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">₹416</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-[14px]">arrow_upward</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">2.1%</span>
                        <span className="text-[10px] text-slate-400">vs last week</span>
                    </div>
                </div>
                {/* Conv. Rate */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conv. Rate</p>
                        <span className="material-symbols-outlined text-blue-500 text-[16px]">trending_up</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">4.8%</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-rose-500 text-[14px]">arrow_downward</span>
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">0.5%</span>
                        <span className="text-[10px] text-slate-400">vs last week</span>
                    </div>
                </div>
                {/* Customers */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customers</p>
                        <span className="material-symbols-outlined text-blue-500 text-[16px]">people</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">1,204</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-[14px]">arrow_upward</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">18.4%</span>
                        <span className="text-[10px] text-slate-400">vs last week</span>
                    </div>
                </div>
            </div>

            {/* Revenue Trend — Last 30 Days */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Revenue Trend — Last 30 Days</h2>
                        <p className="text-xs text-slate-500">Comparison with previous 30 days</p>
                    </div>
                    <select className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 py-1.5 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500">
                        <option>Last 30 Days</option>
                        <option>Last 90 Days</option>
                        <option>This Year</option>
                    </select>
                </div>
                <div className="h-64 relative w-full flex items-end">
                    <div className="absolute inset-0 flex flex-col justify-between py-2">
                        <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
                        <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
                        <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
                        <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
                        <div className="border-b border-slate-300 dark:border-slate-700 w-full h-0"></div>
                    </div>
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                        <defs>
                            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"></stop>
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"></stop>
                            </linearGradient>
                        </defs>
                        <path d="M0,150 C100,120 200,180 300,100 C400,20 500,140 600,90 C700,40 800,110 900,60 C950,35 1000,50 1000,50 L1000,200 L0,200 Z" fill="url(#gradient)"></path>
                        <path d="M0,150 C100,120 200,180 300,100 C400,20 500,140 600,90 C700,40 800,110 900,60 C950,35 1000,50 1000,50" fill="none" stroke="#3b82f6" strokeWidth="3"></path>
                        <path d="M0,180 C150,160 250,190 400,140 C550,90 650,160 800,120 C900,90 1000,130 1000,130" fill="none" stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="2"></path>
                    </svg>
                </div>
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span className="text-slate-600 dark:text-slate-300">Current Period (₹1.42L)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-0 border-t-2 border-dashed border-slate-400"></div><span className="text-slate-600 dark:text-slate-300">Previous Period (₹1.15L)</span></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Funnel Deep-Dive */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Conversion Funnel Deep-Dive</h2>
                    <div className="space-y-5">
                        <div className="relative">
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Total Sessions</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">12,450</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-sm h-6">
                                <div className="bg-blue-100 dark:bg-blue-900/40 h-full rounded-sm border-l-4 border-blue-400" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div className="relative pl-4">
                            <div className="absolute left-0 top-[-20px] bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="absolute left-0 top-1/2 w-4 h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Product Views</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">8,210 <span className="text-xs font-normal text-slate-500">(66%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-sm h-6">
                                <div className="bg-blue-200 dark:bg-blue-800/50 h-full rounded-sm border-l-4 border-blue-500" style={{ width: '85%' }}></div>
                            </div>
                        </div>
                        <div className="relative pl-8">
                            <div className="absolute left-4 top-[-20px] bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="absolute left-4 top-1/2 w-4 h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Add to Cart</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">3,105 <span className="text-xs font-normal text-slate-500">(37%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-sm h-6">
                                <div className="bg-blue-300 dark:bg-blue-700/60 h-full rounded-sm border-l-4 border-blue-600" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                        <div className="relative pl-12">
                            <div className="absolute left-8 top-[-20px] bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="absolute left-8 top-1/2 w-4 h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Purchases</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">1,204 <span className="text-xs font-normal text-slate-500">(38%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-sm h-6">
                                <div className="bg-emerald-100 dark:bg-emerald-900/40 h-full rounded-sm border-l-4 border-emerald-500" style={{ width: '35%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drop-off Reasons */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">Drop-off Reasons</h2>
                    <p className="text-xs text-slate-500 mb-6">Analyzed from bot conversations</p>
                    <div className="flex-1 flex items-center justify-center gap-8">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#f1f5f9" strokeWidth="4"></circle>
                                <circle className="dark:stroke-blue-500" cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#3b82f6" strokeDasharray="45 55" strokeWidth="4"></circle>
                                <circle className="dark:stroke-indigo-500" cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#6366f1" strokeDasharray="25 75" strokeDashoffset="-45" strokeWidth="4"></circle>
                                <circle className="dark:stroke-amber-500" cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#f59e0b" strokeDasharray="20 80" strokeDashoffset="-70" strokeWidth="4"></circle>
                                <circle className="dark:stroke-rose-500" cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#ef4444" strokeDasharray="10 90" strokeDashoffset="-90" strokeWidth="4"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">1.9k</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Drop-offs</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                                <span className="text-slate-600 dark:text-slate-300 w-24">Price too high</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">45%</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                                <span className="text-slate-600 dark:text-slate-300 w-24">Out of stock</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">25%</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                                <span className="text-slate-600 dark:text-slate-300 w-24">Just browsing</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">20%</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
                                <span className="text-slate-600 dark:text-slate-300 w-24">Bot error</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">10%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Products & Out of Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Products */}
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Top Performing Products</h2>
                        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
                            Full Report <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Product Details</th>
                                    <th className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] text-right">Sales Vol</th>
                                    <th className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] text-right">Revenue</th>
                                    <th className="py-3 px-5 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] text-right">Reserve Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 px-5">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">Apple iPhone 15 Pro</p>
                                        <p className="text-xs text-slate-500">256GB, Natural Titanium</p>
                                    </td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-700 dark:text-slate-300">124</td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-800 dark:text-slate-200">₹1,67,40k</td>
                                    <td className="py-3 px-5 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            82%
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 px-5">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">Sony PlayStation 5</p>
                                        <p className="text-xs text-slate-500">Disc Edition</p>
                                    </td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-700 dark:text-slate-300">89</td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-800 dark:text-slate-200">₹48,95k</td>
                                    <td className="py-3 px-5 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            95%
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 px-5">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">Samsung Galaxy S24 Ultra</p>
                                        <p className="text-xs text-slate-500">512GB, Titanium Black</p>
                                    </td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-700 dark:text-slate-300">76</td>
                                    <td className="py-3 px-5 text-right font-medium text-slate-800 dark:text-slate-200">₹98,80k</td>
                                    <td className="py-3 px-5 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            68%
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Out of Stock & High Demand */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Out of Stock & High Demand</h2>
                            <span className="material-symbols-outlined text-amber-500">warning</span>
                        </div>
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-700 flex items-start justify-between">
                                <div>
                                    <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">iPhone 15 Pro Max (1TB)</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">person</span>
                                        Requested 45 times
                                    </p>
                                </div>
                                <span className="text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded">Critical</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-700 flex items-start justify-between">
                                <div>
                                    <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">Dyson Airwrap Multi-styler</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">person</span>
                                        Requested 28 times
                                    </p>
                                </div>
                                <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded">High</span>
                            </div>
                        </div>
                    </div>

                    {/* Bot Performance */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Bot Performance (Last 7 Days)</h2>
                        <div className="relative h-24 flex items-end gap-3 justify-between px-2">
                            <div className="w-full h-[85%] bg-blue-100 dark:bg-blue-900/30 rounded-t-sm relative group">
                                <div className="absolute bottom-0 w-full h-[15%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[95%] bg-blue-200 dark:bg-blue-800/40 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[10%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[70%] bg-blue-300 dark:bg-blue-700/50 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[5%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[80%] bg-blue-400 dark:bg-blue-600/60 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[12%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[100%] bg-blue-500 dark:bg-blue-500/70 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[8%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[60%] bg-blue-400 dark:bg-blue-600/60 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[18%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                            <div className="w-full h-[75%] bg-blue-500 dark:bg-blue-500/70 rounded-t-sm relative">
                                <div className="absolute bottom-0 w-full h-[6%] bg-rose-400/80 rounded-b-sm"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 px-2 uppercase tracking-wider">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-[10px] sm:text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div><span className="text-slate-600 dark:text-slate-300">Successful Responses</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-400/80 rounded-sm"></div><span className="text-slate-600 dark:text-slate-300">Error / Fallback</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
