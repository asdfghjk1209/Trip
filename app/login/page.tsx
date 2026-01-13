'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Plane, Sparkles, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 登录后跳转回首页，需在 Supabase 后台 Authentication -> URL Configuration 配置 Site URL
        emailRedirectTo: `${window.location.origin}/`, 
      },
    })
    setLoading(false)
    if (!error) setSent(true)
    else alert(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* 头部装饰 */}
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             <div className="text-white text-center z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
                    <Plane className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">TripSync</h1>
                <p className="text-indigo-100 text-xs mt-1">你的智能行程伴侣</p>
             </div>
        </div>

        <div className="p-8">
            {!sent ? (
                <>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">欢迎回来</h2>
                    <p className="text-sm text-slate-500 mb-6">输入邮箱，我们将发送无密码登录链接给你。</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">邮箱地址</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={18}/>}
                            发送登录链接
                        </button>
                    </form>
                </>
            ) : (
                <div className="text-center py-8 animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">邮件已发送！</h3>
                    <p className="text-sm text-slate-500 mb-6">请检查你的收件箱，点击链接即可登录。</p>
                    <button onClick={() => setSent(false)} className="text-xs text-indigo-600 hover:underline font-medium">返回修改邮箱</button>
                </div>
            )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-400">完全免费 · 无需密码 · 安全可靠</p>
        </div>
      </div>
    </div>
  )
}