'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Plane, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    
    // 获取当前网站的基础路径（自动适配 localhost 或 vercel 域名）
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })
    
    setLoading(false)
    if (error) {
        setStatus('error')
        setErrorMessage(error.message)
    } else {
        setStatus('success')
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900">
      
      {/* 左侧：沉浸式图片 (移动端隐藏) */}
      <div className="hidden lg:flex w-1/2 bg-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/20 z-10"></div>
        <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            className="w-full h-full object-cover animate-[scale_40s_linear_infinite_alternate]" // 缓慢缩放动效
            alt="Travel background"
        />
        <div className="absolute bottom-12 left-12 z-20 text-white max-w-md">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/30">
                    <Plane size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight">TripSync</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">探索世界，<br/>从规划每一次心动开始。</h2>
            <p className="text-white/80 text-sm">您的智能行程管家，让每一次出发都井井有条。</p>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        {/* 返回按钮 */}
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> 返回首页
        </Link>

        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
                <p className="text-slate-500 mt-2 text-sm">输入邮箱，即刻开启您的旅程（无需密码）</p>
            </div>

            {status === 'success' ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-slate-900 font-bold mb-1">邮件已发送!</h3>
                    <p className="text-slate-500 text-xs mb-4">
                        请检查您的邮箱 <strong>{email}</strong>，点击链接即可自动登录。
                    </p>
                    <button onClick={() => setStatus('idle')} className="text-xs text-emerald-600 font-medium hover:underline">
                        换个邮箱登录
                    </button>
                </div>
            ) : (
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold text-slate-900 uppercase tracking-wider block">邮箱地址</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18}/>
                            <input 
                                id="email"
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                            <AlertCircle size={16} />
                            <span>{errorMessage || "登录失败，请稍后重试"}</span>
                        </div>
                    )}

                    <button 
                        disabled={loading}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : "获取登录链接"}
                    </button>
                </form>
            )}

            <div className="pt-6 text-center">
                <p className="text-[10px] text-slate-400">
                    点击登录即代表您同意我们的 <a href="#" className="underline hover:text-slate-600">服务条款</a> 和 <a href="#" className="underline hover:text-slate-600">隐私政策</a>
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}