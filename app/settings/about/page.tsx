export const dynamic = 'force-dynamic';

import { Github, Twitter, Globe, Info } from 'lucide-react';

export default function AboutSettings() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-1">关于 TripSync</h2>
                <p className="text-zinc-500">了解更多关于这个项目的信息。</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/20">
                    <Globe size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">TripSync</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-6">
                    这是一个专为你和朋友打造的极简多人协作旅行规划应用。
                    让每一次旅程都井井有条，充满乐趣。
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <Info size={16} className="text-indigo-500" /> 版本信息
                    </h4>
                    <div className="space-y-2 text-xs text-zinc-500">
                        <div className="flex justify-between">
                            <span>当前版本</span>
                            <span className="font-mono text-zinc-900 dark:text-zinc-100">v1.2.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span>构建时间</span>
                            <span className="font-mono text-zinc-900 dark:text-zinc-100">2026-10-12</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h4 className="font-bold text-sm mb-2">技术栈</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Next.js 16, React 19, Tailwind CSS v4, Supabase, Framer Motion, dnd-kit.
                    </p>
                </div>
            </div>

            <div className="text-center text-[10px] text-zinc-400 pt-8">
                &copy; {new Date().getFullYear()} TripSync. Designed for explorers.
            </div>
        </div>
    )
}
