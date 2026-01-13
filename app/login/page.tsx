'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase' // 确保这里引用的是我们之前改过的 supabase-ssr 那个文件
import { Loader2, LayoutGrid, Mail, ArrowRight, Check, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email') // 控制当前是输邮箱还是输验证码
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  
  // 第一步：发送验证码
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // ✨ 关键修改：设置为 false，这样 Supabase 就不会发链接，而是发纯数字验证码
        shouldCreateUser: true, 
      },
    })
    
    setLoading(false)
    if (error) {
        setErrorMsg(error.message)
    } else {
        setStep('otp') // 切换到输入验证码界面
    }
  }

  // 第二步：验证验证码
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
    })

    if (error) {
        setLoading(false)
        setErrorMsg(error.message)
    } else {
        // 登录成功！
        router.push('/') // 跳转主页
        router.refresh() // 刷新状态
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 头部 Logo */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 mb-4">
                <LayoutGrid size={24} />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">TripSync</h1>
            <p className="text-xs text-zinc-500 mt-1">登录以继续您的旅程</p>
        </div>

        {/* 阶段一：输入邮箱 */}
        {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                            获取验证码 <ArrowRight size={14} className="opacity-60"/>
                        </>
                    )}
                </button>
            </form>
        ) : (
            /* 阶段二：输入验证码 */
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <Mail size={18} />
                    </div>
                    <p className="text-xs text-zinc-500">
                        验证码已发送至 <span className="font-bold text-zinc-800">{email}</span>
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">6位验证码</label>
                    <div className="relative group">
                        <KeyRound className="absolute left-3 top-3 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={16}/>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            value={otp}
                            onChange={e => setOtp(e.target.value.trim())}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all placeholder:text-zinc-400 tracking-widest font-mono"
                        />
                    </div>
                </div>

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
                            登录 / 注册 <Check size={14} className="opacity-60"/>
                        </>
                    )}
                </button>
                
                <button 
                    type="button"
                    onClick={() => { setStep('email'); setErrorMsg(''); }}
                    className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-2"
                >
                    返回修改邮箱
                </button>
            </form>
        )}
      </div>
      
      <div className="mt-8 text-[10px] text-zinc-300">
        &copy; 2026 TripSync. Private use only.
      </div>
    </div>
  )
}