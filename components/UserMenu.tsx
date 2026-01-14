'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { cn } from "@/lib/utils"

interface UserMenuProps {
  user: any;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function UserMenu({ user, onLogout, onOpenSettings }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 监听点击外部事件，自动关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  // 获取用户邮箱首字母
  const firstLetter = user.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="relative" ref={menuRef}>
      {/* 1. 头像按钮：改为点击触发 (onClick) */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all overflow-hidden border cursor-pointer outline-none",
            isOpen 
                ? "ring-2 ring-indigo-500/30 border-indigo-500" 
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"
        )}
      >
        {user.user_metadata?.avatar_url ? (
             <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                {firstLetter}
            </div>
        )}
      </button>

      {/* 2. 下拉菜单：绝对定位 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-1.5 animate-in fade-in zoom-in-95 slide-in-from-top-2 z-50">
            {/* 用户信息区 */}
            <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">个人账号</p>
            </div>
            
            {/* 菜单选项 */}
            <button 
                onClick={() => { setIsOpen(false); onOpenSettings(); }} 
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-colors text-zinc-700 dark:text-zinc-300"
            >
                <Settings size={14}/> 通用设置
            </button>
            
            <button 
                onClick={() => { setIsOpen(false); onLogout(); }} 
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors"
            >
                <LogOut size={14}/> 退出登录
            </button>
        </div>
      )}
    </div>
  )
}