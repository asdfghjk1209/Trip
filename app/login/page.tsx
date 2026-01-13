'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, LayoutGrid, Mail, ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    // 动态获取当前域名 (localhost 或 vercel.app)
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    
    setLoading(false)
    if (error) {
        setErrorMsg(error.message)
    } else {
        setIsSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      
      {/* 极简卡片容器 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 头部 Logo */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 mb-4">
                <LayoutGrid size={24} />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">TripSync</h1>
            <p className="text-xs text-zinc-500 mt-1">登录以继续您的旅程</p>
        </div>

        {/* 状态：发送成功 */}
        {isSuccess ? (
            <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-50/50">
                    <Check size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-zinc-900">邮件已发送</h3>
                    <p className="text-xs text-zinc-500 mt-1 px-4">
                        验证链接已发送至 <span className="font-medium text-zinc-700">{email}</span>，点击链接即可自动登录。
                    </p>
                </div>
                <button 
                    onClick={() => setIsSuccess(false)} 
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                    返回修改邮箱
                </button>
            </div>
        ) : (
            /* 状态：登录表单 */
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">邮箱地址</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={16}/>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all placeholder:text-zinc-400"
                        />
                    </div>
                </div>

                {/* 错误提示 */}
                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 flex items-center gap-2">
                        <span>⚠️ {errorMsg}</span>
                    </div>
                )}

                <button 
                    disabled={loading}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl shadow-lg shadow-zinc-200/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : (
                        <>
                            发送登录链接 <ArrowRight size={14} className="opacity-60"/>
                        </>
                    )}
                </button>
            </form>
        )}
      </div>

      {/* 底部版权 (可选) */}
      <div className="mt-8 text-[10px] text-zinc-300">
        &copy; 2026 TripSync. Private use only.
      </div>
    </div>
  )
}