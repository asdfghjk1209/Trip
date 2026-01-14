'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, Moon, Sun, Monitor, ChevronRight, LogOut, 
  User, Mail, Shield, Bell, HelpCircle 
} from 'lucide-react'
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // 初始化：获取用户和当前主题
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // 检测当前主题
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
    initData()
  }, [])

  // 切换主题逻辑
  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">设置</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* 1. 个人资料卡片 */}
        <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">个人资料</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-2xl font-bold">
                        {user?.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{user?.email?.split('@')[0]}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                    </div>
                    <button className="px-4 py-1.5 text-xs font-bold border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        编辑
                    </button>
                </div>
            </div>
        </section>

        {/* 2. 外观设置 */}
        <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">外观</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-4">
                <button 
                    onClick={() => toggleTheme('light')}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        theme === 'light' 
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600" 
                            : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", theme === 'light' ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-500")}>
                        <Sun size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">浅色模式</div>
                        <div className="text-[10px] text-zinc-500">明亮清晰</div>
                    </div>
                </button>

                <button 
                    onClick={() => toggleTheme('dark')}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        theme === 'dark' 
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600" 
                            : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", theme === 'dark' ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500")}>
                        <Moon size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">深色模式</div>
                        <div className="text-[10px] text-zinc-500">护眼舒适</div>
                    </div>
                </button>
            </div>
        </section>

        {/* 3. 通用选项列表 */}
        <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">账号与安全</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {[
                    { icon: Bell, label: '通知设置', desc: '管理邮件和推送通知' },
                    { icon: Shield, label: '隐私与安全', desc: '修改密码、双重验证' },
                    { icon: HelpCircle, label: '帮助与支持', desc: '常见问题、联系客服' },
                ].map((item, i) => (
                    <button key={i} className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 text-left group">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                            <item.icon size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</div>
                            <div className="text-xs text-zinc-500">{item.desc}</div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300" />
                    </button>
                ))}
            </div>
        </section>

        {/* 4. 退出登录区 */}
        <div className="pt-4">
            <button 
                onClick={handleLogout}
                className="w-full py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
                <LogOut size={16} /> 退出当前账号
            </button>
            <p className="text-center text-[10px] text-zinc-400 mt-4">Version 1.0.2 (Build 20260114)</p>
        </div>

      </main>
    </div>
  )
}