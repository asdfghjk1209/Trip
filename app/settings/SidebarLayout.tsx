import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Settings, Palette, Bell, Info, Shield, ArrowLeft } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/settings/general', label: '通用设置', icon: Settings },
    { href: '/settings/appearance', label: '外观 & 主题', icon: Palette },
    { href: '/settings/notifications', label: '通知推送', icon: Bell },
    { href: '/settings/about', label: '关于 TripSync', icon: Info },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    // 注意：layout 是服务端组件，不能直接用 usePathname，需要拆分 Sidebar 为客户端组件
    // 但为了简化，我们先把 Sidebar 做成客户端组件引入
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row">
            {/* 顶部移动端导航 / 返回按钮 */}
            <div className="md:hidden flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <Link href="/" className="mr-4 text-zinc-500"><ArrowLeft size={20} /></Link>
                <h1 className="font-bold">设置</h1>
            </div>

            <Sidebar />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

function Sidebar() {
    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl h-screen sticky top-0">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <Link href="/" className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold tracking-tight hover:opacity-70 transition-opacity">
                    <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center">
                        <ArrowLeft size={16} />
                    </div>
                    <span>返回主页</span>
                </Link>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1">
                <div className="px-2 mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Project Settings</div>
                <NavLinks />
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                    <div className="text-xs">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">My Account</div>
                        <div className="text-zinc-500">Manage Profile</div>
                    </div>
                </div>
            </div>
        </aside>
    )
}

// 客户端组件分离
'use client';
import { usePathname } from 'next/navigation';

function NavLinks() {
    const pathname = usePathname();

    // 简单的判断 isActive，兼容子路由
    const isActive = (href: string) => pathname?.startsWith(href);

    const NAV_ITEMS = [
        { href: '/settings/general', label: '通用设置', icon: Settings },
        { href: '/settings/appearance', label: '外观 & 主题', icon: Palette },
        { href: '/settings/notifications', label: '通知推送', icon: Bell },
        { href: '/settings/about', label: '关于 TripSync', icon: Info },
    ];

    return (
        <>
            {NAV_ITEMS.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                        isActive(item.href)
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                >
                    <item.icon size={18} className={cn("transition-colors", isActive(item.href) ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 group-hover:text-zinc-600")} />
                    {item.label}
                    {isActive(item.href) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-zinc-900 dark:bg-white rounded-r-full"></div>}
                </Link>
            ))}
        </>
    )
}
