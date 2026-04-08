export default function DashboardOverview() {
    return (
        <div className="w-full flex flex-col gap-6">
            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Today */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-icons text-6xl text-primary">currency_rupee</span>
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Revenue Today</p>
                            <h3 className="text-2xl font-bold text-foreground">₹47,500</h3>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <span className="material-icons text-green-600 dark:text-green-400 text-sm">trending_up</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">+12.5%</span>
                        <span className="text-xs text-muted-foreground">vs yesterday</span>
                    </div>
                    <div className="mt-4 h-10 w-full flex items-end gap-1 relative z-10">
                        <div className="w-1/6 bg-primary/20 h-[30%] rounded-t-sm"></div>
                        <div className="w-1/6 bg-primary/20 h-[50%] rounded-t-sm"></div>
                        <div className="w-1/6 bg-primary/20 h-[40%] rounded-t-sm"></div>
                        <div className="w-1/6 bg-primary/40 h-[70%] rounded-t-sm"></div>
                        <div className="w-1/6 bg-primary/60 h-[85%] rounded-t-sm"></div>
                        <div className="w-1/6 bg-primary h-full rounded-t-sm"></div>
                    </div>
                </div>

                {/* Orders Today */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-icons text-6xl text-primary">local_mall</span>
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Orders Today</p>
                            <h3 className="text-2xl font-bold text-foreground">11</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <span className="material-icons text-primary text-sm">inventory</span>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3 relative z-10">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Completed (8)</span>
                                <span className="font-medium text-foreground">72%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 border border-border">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '72%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Pending (3)</span>
                                <span className="font-medium text-foreground">28%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 border border-border">
                                <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: '28%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Reservations */}
                <div className="bg-card rounded-xl p-5 shadow-sm border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-icons text-6xl text-primary">timer</span>
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Active Reservations</p>
                            <h3 className="text-2xl font-bold text-foreground">3 <span className="text-sm font-normal text-muted-foreground">live</span></h3>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                            <span className="material-icons text-orange-600 dark:text-orange-400 text-sm">hourglass_top</span>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2 relative z-10">
                        <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-foreground">Samsung S24 Ultra</span>
                            </div>
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">12:05 left</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-xs font-medium text-foreground">Sony WH-1000XM5</span>
                            </div>
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">45:20 left</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow-sm border border-border flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Revenue — Last 7 Days</h2>
                        <button className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                            This Week <span className="material-icons text-[16px]">expand_more</span>
                        </button>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 mt-auto pt-4 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-muted-foreground pb-6">
                            <span>50k</span>
                            <span>25k</span>
                            <span>0</span>
                        </div>
                        <div className="absolute left-8 right-0 top-1.5 h-[1px] bg-border"></div>
                        <div className="absolute left-8 right-0 top-1/2 h-[1px] bg-border"></div>
                        <div className="absolute left-8 right-0 bottom-6 h-[1px] bg-border"></div>
                        <div className="ml-8 flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/40 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '40%' }}>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap transition-opacity">₹18,500</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-2">Mon</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/40 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '55%' }}></div>
                            <span className="text-[10px] text-muted-foreground mt-2">Tue</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/40 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '45%' }}></div>
                            <span className="text-[10px] text-muted-foreground mt-2">Wed</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/40 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '70%' }}></div>
                            <span className="text-[10px] text-muted-foreground mt-2">Thu</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/40 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '60%' }}></div>
                            <span className="text-[10px] text-muted-foreground mt-2">Fri</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary/80 group-hover:bg-primary transition-colors rounded-t-md relative" style={{ height: '85%' }}></div>
                            <span className="text-[10px] font-medium text-foreground mt-2">Sat</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-end group">
                            <div className="w-full max-w-[40px] bg-primary rounded-t-md relative shadow-sm" style={{ height: '95%' }}>
                                <div className="opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap">₹47,500</div>
                            </div>
                            <span className="text-[10px] font-bold text-primary mt-2">Sun</span>
                        </div>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="lg:col-span-1 bg-card rounded-xl p-5 shadow-sm border border-border">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Conversion Funnel</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground font-medium flex items-center gap-2">
                                    <span className="material-icons text-muted-foreground text-[16px]">chat</span> Bot Interactions
                                </span>
                                <span className="font-bold text-foreground">1,240</span>
                            </div>
                            <div className="w-full bg-secondary rounded-r-full h-8 flex items-center border border-border">
                                <div className="bg-blue-100/40 dark:bg-blue-900/40 h-full rounded-r-full border-r-4 border-blue-400" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground font-medium flex items-center gap-2">
                                    <span className="material-icons text-muted-foreground text-[16px]">touch_app</span> Product Views
                                </span>
                                <span className="font-bold text-foreground">856</span>
                            </div>
                            <div className="w-full bg-secondary rounded-r-full h-8 flex items-center border border-border">
                                <div className="bg-blue-200/50 dark:bg-blue-800/50 h-full rounded-r-full border-r-4 border-blue-500" style={{ width: '69%' }}></div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">69% of interactions</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground font-medium flex items-center gap-2">
                                    <span className="material-icons text-muted-foreground text-[16px]">shopping_cart_checkout</span> Add to Cart
                                </span>
                                <span className="font-bold text-foreground">312</span>
                            </div>
                            <div className="w-full bg-secondary rounded-r-full h-8 flex items-center border border-border">
                                <div className="bg-blue-300/60 dark:bg-blue-700/60 h-full rounded-r-full border-r-4 border-blue-600" style={{ width: '36%' }}></div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">36% of views</p>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-foreground font-medium flex items-center gap-2">
                                    <span className="material-icons text-green-500 text-[16px]">check_circle</span> Completed Orders
                                </span>
                                <span className="font-bold text-green-600 dark:text-green-400">84</span>
                            </div>
                            <div className="w-full bg-secondary rounded-r-full h-8 flex items-center border border-border">
                                <div className="bg-green-100/40 dark:bg-green-900/40 h-full rounded-r-full border-r-4 border-green-500" style={{ width: '26%' }}></div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">26% conversion rate</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-card rounded-xl shadow-sm border border-border flex flex-col h-80">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50 rounded-t-xl">
                        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <span className="material-icons text-orange-500 text-[18px]">access_time</span>
                            Live Reservations
                        </h2>
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">3 Active</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        <ul className="space-y-2">
                            <li className="bg-card p-3 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <p className="font-medium text-sm text-foreground">Samsung S24 Ultra 256GB</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Customer: Rahul K. • +91 98765*****</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400 animate-pulse">12:05</p>
                                        <p className="text-[10px] text-muted-foreground">Expires soon</p>
                                    </div>
                                </div>
                            </li>
                            <li className="bg-card p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <p className="font-medium text-sm text-foreground">Sony WH-1000XM5</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Customer: Priya S. • +91 99887*****</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">45:20</p>
                                        <p className="text-[10px] text-muted-foreground">Remaining</p>
                                    </div>
                                </div>
                            </li>
                            <li className="bg-card p-3 rounded-lg border border-green-200 dark:border-green-900/50 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <p className="font-medium text-sm text-foreground">Apple AirPods Pro 2</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Customer: Amit M. • +91 91234*****</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-600 dark:text-green-400">01:15:00</p>
                                        <p className="text-[10px] text-muted-foreground">Remaining</p>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-card rounded-xl shadow-sm border border-border flex flex-col h-80">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50 rounded-t-xl">
                        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <span className="material-icons text-primary text-[18px]">history</span>
                            Recent Activity
                        </h2>
                        <button className="text-xs text-primary hover:underline font-medium">View All</button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4">
                        <div className="relative border-l border-border ml-3 space-y-6 pb-4">
                            <div className="relative pl-6">
                                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                                <p className="text-sm font-medium text-foreground">Order #4092 Completed</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Payment received for iPhone 15 Pro via UPI.</p>
                                <span className="text-[10px] text-muted-foreground mt-1 block">2 mins ago</span>
                            </div>
                            <div className="relative pl-6">
                                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-background"></div>
                                <p className="text-sm font-medium text-foreground">New Inquiry</p>
                                <p className="text-xs text-muted-foreground mt-0.5">User asked about availability of "Dell XPS 13". Bot replied: In stock.</p>
                                <span className="text-[10px] text-muted-foreground mt-1 block">15 mins ago</span>
                            </div>
                            <div className="relative pl-6">
                                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-yellow-500 border-2 border-background"></div>
                                <p className="text-sm font-medium text-foreground">Reservation Expired</p>
                                <p className="text-xs text-muted-foreground mt-0.5">JBL Flip 6 reservation for +91 99... timed out. Stock returned.</p>
                                <span className="text-[10px] text-muted-foreground mt-1 block">42 mins ago</span>
                            </div>
                            <div className="relative pl-6">
                                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-purple-500 border-2 border-background"></div>
                                <p className="text-sm font-medium text-foreground">Catalog Updated</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Admin updated prices for 12 audio accessories.</p>
                                <span className="text-[10px] text-muted-foreground mt-1 block">2 hours ago</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 dark:from-primary/20 dark:to-blue-900/10 rounded-xl p-5 border border-primary/20 flex-1 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                            <span className="material-icons text-primary">queue</span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Waitlist Management</h3>
                        <p className="text-sm text-muted-foreground mb-4">4 items are currently out of stock with active waitlists.</p>
                        <button className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors w-full shadow-sm">
                            View Waitlists
                        </button>
                    </div>
                    <div className="bg-card rounded-xl p-5 border border-border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <span className="material-icons text-green-600 dark:text-green-400">check_circle</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-foreground">Bot Health</h4>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">All systems operational</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">Uptime</p>
                            <p className="text-sm font-bold text-foreground">99.9%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
