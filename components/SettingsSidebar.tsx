'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Settings, Palette, Bell, Info, ArrowLeft } from 'lucide-react';

export default function SettingsSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const backUrl = searchParams.get('from') || '/';
    const isActive = (href: string) => pathname?.startsWith(href);

    const NAV_ITEMS = [
        { href: '/settings/general', label: '通用设置', icon: Settings },
        { href: '/settings/appearance', label: '外观 & 主题', icon: Palette },
        { href: '/settings/notifications', label: '通知推送', icon: Bell },
        { href: '/settings/about', label: '关于 TripSync', icon: Info },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl h-screen sticky top-0 shrink-0">
            <div className="p-6 h-16 flex items-center border-b border-zinc-200/50 dark:border-zinc-800/50">
                <Link href={backUrl} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="font-bold text-sm tracking-tight text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">返回</span>
                </Link>
            </div>

            <div className="flex-1 py-8 px-4 space-y-6 overflow-y-auto">
                <div>
                    <div className="px-3 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">设置菜单</div>
                    <nav className="space-y-0.5">
                        {NAV_ITEMS.map(item => (
                            <Link
                                key={item.href}
                                href={`${item.href}${backUrl !== '/' ? `?from=${encodeURIComponent(backUrl)}` : ''}`}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                    isActive(item.href)
                                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                        : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <item.icon size={16} strokeWidth={isActive(item.href) ? 2.5 : 2} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm"></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">当前账户</div>
                        <div className="text-[10px] text-zinc-500 truncate">管理个人资料</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
