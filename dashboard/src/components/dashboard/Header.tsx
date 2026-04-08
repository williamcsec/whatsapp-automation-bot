'use client';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <header className="h-16 bg-[#1F2937] border-b border-[#374151] flex items-center justify-between px-6 shrink-0 z-10 text-[#F9FAFB]">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold text-white hidden sm:block">{title}</h1>
                {subtitle && (
                    <>
                        <span className="text-gray-400 hidden sm:block">/</span>
                        <span className="text-sm font-medium text-gray-300 bg-[#374151] px-3 py-1 rounded-full border border-gray-600">
                            {subtitle}
                        </span>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
                {/* Human Override Warning Banner Placeholder - We can make this dynamic later */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/40 text-green-400 rounded-full border border-green-800">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium">Bot Active</span>
                </div>

                <button className="relative p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-800">
                    <span className="material-icons">notifications_none</span>
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-[#1F2937]"></span>
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        A
                    </div>
                    <div className="hidden md:block text-sm">
                        <p className="font-medium text-white leading-none mb-1">Admin User</p>
                        <p className="text-xs text-gray-400 leading-none">Manager</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
