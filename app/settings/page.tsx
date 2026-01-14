'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, Moon, Sun, ChevronRight, LogOut, 
  Bell, Shield, HelpCircle, FileText, Smartphone, Globe, Check, RotateCcw
} from 'lucide-react'
import { cn } from "@/lib/utils"

// 简单的 Toast 提示组件
function Toast({ show, message }: { show: boolean, message: string }) {
    if (!show) return null;
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 fade-in">
             <div className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2">
                <Check size={14} strokeWidth={3} className="text-emerald-400"/>
                {message}
             </div>
        </div>
    )
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  
  // 核心状态：activeTheme 是当前生效的，pendingTheme 是用户正在选择但未保存的
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light')
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark'>('light')
  
  const [showToast, setShowToast] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 初始化：获取用户和当前生效的主题
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // 读取当前真正的主题
      const isDark = document.documentElement.classList.contains('dark')
      const current = isDark ? 'dark' : 'light'
      
      setActiveTheme(current)
      setPendingTheme(current) // 初始时，待定主题等于当前主题
    }
    initData()
  }, [])

  // 监听是否有未保存的更改
  useEffect(() => {
      setHasChanges(activeTheme !== pendingTheme)
  }, [activeTheme, pendingTheme])

  // 处理主题选择（只更新 UI 选中状态，不应用 CSS）
  const handleSelectTheme = (theme: 'light' | 'dark') => {
    setPendingTheme(theme)
  }

  // 核心功能：保存并应用更改
  const handleSave = () => {
    if (!hasChanges) return;

    // 1. 应用到 DOM
    if (pendingTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }

    // 2. 更新状态
    setActiveTheme(pendingTheme)
    setHasChanges(false)
    
    // 3. 提示成功
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  // 还原默认设置
  const handleReset = () => {
      setPendingTheme('light') // 假设默认是浅色，或者您可以设置为 'system' 逻辑
  }

  // 处理返回（如果有修改未保存，直接退出即丢弃）
  const handleBack = () => {
      // 这里直接返回，不做保存，符合“退出则不应用更改”的要求
      router.back()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 pb-10">
      <Toast show={showToast} message="设置已保存" />

      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={handleBack} 
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">设置</h1>
          </div>
          
          {/* 顶部保存按钮 (当有更改时显示) */}
          <button 
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300",
                hasChanges 
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 opacity-100 scale-100" 
                    : "bg-zinc-100 text-zinc-400 opacity-0 scale-90 pointer-events-none"
            )}
          >
            保存
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* 1. 个人资料卡片 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
                {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg truncate">{user?.email?.split('@')[0]}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
            </div>
            <button className="px-5 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-opacity">
                编辑
            </button>
        </div>

        {/* 2. 外观设置 (暂存模式) */}
        <div>
            <div className="flex items-center justify-between mb-3 px-2">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">外观体验</h2>
                {/* 还原按钮 */}
                <button onClick={handleReset} className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors">
                    <RotateCcw size={10} /> 恢复默认
                </button>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-sm grid grid-cols-2 gap-2 relative overflow-hidden">
                {/* 提示遮罩：如果未保存更改，显示提示条 */}
                {hasChanges && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-amber-500 z-10 animate-in slide-in-from-left duration-500" />
                )}

                <button 
                    onClick={() => handleSelectTheme('light')}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative",
                        pendingTheme === 'light' 
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-600 text-indigo-600 dark:text-indigo-400" 
                            : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", pendingTheme === 'light' ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-zinc-100 dark:bg-zinc-800")}>
                        <Sun size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-sm">浅色模式</div>
                        {activeTheme === 'light' && <div className="text-[10px] text-zinc-400">当前使用中</div>}
                    </div>
                    {pendingTheme === 'light' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600"></div>}
                </button>

                <button 
                    onClick={() => handleSelectTheme('dark')}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative",
                        pendingTheme === 'dark' 
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-600 text-indigo-600 dark:text-indigo-400" 
                            : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", pendingTheme === 'dark' ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-zinc-100 dark:bg-zinc-800")}>
                        <Moon size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-sm">深色模式</div>
                        {activeTheme === 'dark' && <div className="text-[10px] text-zinc-400">当前使用中</div>}
                    </div>
                    {pendingTheme === 'dark' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600"></div>}
                </button>
            </div>
            
            {/* 更改提示 */}
            <div className={cn("mt-2 px-2 text-xs transition-all duration-300 overflow-hidden", hasChanges ? "h-6 opacity-100" : "h-0 opacity-0")}>
                <span className="text-amber-600 dark:text-amber-500 font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/> 
                    修改尚未应用，请点击右上角保存
                </span>
            </div>
        </div>

        {/* 3. 其他设置列表 (静态展示) */}
        {[
            { title: "偏好设置", items: [{ icon: Bell, label: '通知推送' }, { icon: Globe, label: '语言与地区' }] },
            { title: "账号与安全", items: [{ icon: Shield, label: '登录与安全' }, { icon: Smartphone, label: '关联设备' }] },
        ].map((section, idx) => (
            <div key={idx}>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">{section.title}</h2>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    {section.items.map((item, i) => (
                        <div key={i} className="w-full flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 text-left">
                            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <item.icon size={18} />
                            </div>
                            <div className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</div>
                            <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />
                        </div>
                    ))}
                </div>
            </div>
        ))}

        {/* 4. 底部退出 */}
        <div className="pt-6">
            <button 
                onClick={handleLogout}
                className="w-full py-3.5 rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
            >
                <LogOut size={16} /> 退出当前账号
            </button>
        </div>

      </main>
    </div>
  )
}