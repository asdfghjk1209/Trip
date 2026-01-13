'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, LayoutGrid, Mail, ArrowRight, Check, KeyRound, RefreshCcw, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  
  // 状态管理
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  // 倒计时与限制
  const [countdown, setCountdown] = useState(0) // 倒计时秒数
  const [retryCount, setRetryCount] = useState(0) // 输错次数
  const MAX_RETRIES = 5 // 最大允许输错次数

  const router = useRouter()

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 第一步：发送验证码
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    // 简单的邮箱格式校验
    if(!email.includes('@') || !email.includes('.')) {
        setLoading(false)
        setErrorMsg('请输入有效的邮箱地址')
        return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, 
      },
    })
    
    setLoading(false)
    if (error) {
        // 处理 Supabase 的频率限制错误
        if (error.message.includes('Rate limit') || error.status === 429) {
            setErrorMsg('发送太频繁了，请稍后再试 (约60秒)')
            setCountdown(60) // 强制开启倒计时
        } else {
            setErrorMsg(error.message)
        }
    } else {
        setStep('otp')
        setCountdown(60) // 开始60秒倒计时
        setRetryCount(0) // 重置尝试次数
        setSuccessMsg('验证码已发送，请查收邮件（包括垃圾箱）')
    }
  }

  // 第二步：验证验证码
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 检查尝试次数
    if (retryCount >= MAX_RETRIES) {
        setErrorMsg('错误次数过多，请重新获取验证码')
        return
    }

    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
    })

    if (error) {
        setLoading(false)
        setRetryCount(prev => prev + 1) // 增加错误计数
        const remaining = MAX_RETRIES - (retryCount + 1)
        
        if (remaining <= 0) {
            setErrorMsg('错误次数过多，请点击下方按钮重新获取')
        } else {
            setErrorMsg(`验证码错误或已失效。剩余尝试机会：${remaining}次`)
        }
    } else {
        // 登录成功
        router.push('/')
        router.refresh()
    }
  }

  // 重新发送处理
  const handleResend = () => {
      setStep('email')
      setOtp('')
      setErrorMsg('')
      setSuccessMsg('')
      // 注意：这里不重置倒计时，如果还在倒计时中，用户需要等待
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* 顶部进度条 (倒计时视觉反馈) */}
        {countdown > 0 && (
            <div 
                className="absolute top-0 left-0 h-1 bg-zinc-900 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 60) * 100}%` }}
            />
        )}

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
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0"/>
                        <span>{errorMsg}</span>
                    </div>
                )}

                <button 
                    disabled={loading || countdown > 0}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl shadow-lg shadow-zinc-200/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : (
                        countdown > 0 ? (
                            <span className="font-mono text-zinc-300">{countdown}s 后可重试</span>
                        ) : (
                            <>
                                获取验证码 <ArrowRight size={14} className="opacity-60"/>
                            </>
                        )
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
                    {successMsg && <p className="text-[10px] text-emerald-600 mt-1">{successMsg}</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">6位验证码</label>
                        {countdown > 0 && <span className="text-[10px] font-mono text-zinc-400">{countdown}s</span>}
                    </div>
                    <div className="relative group">
                        <KeyRound className="absolute left-3 top-3 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={16}/>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            disabled={retryCount >= MAX_RETRIES}
                            value={otp}
                            onChange={e => setOtp(e.target.value.trim())}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all placeholder:text-zinc-400 tracking-widest font-mono disabled:opacity-50"
                        />
                    </div>
                </div>

                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                         <AlertCircle size={14} className="mt-0.5 flex-shrink-0"/>
                        <span>{errorMsg}</span>
                    </div>
                )}

                <button 
                    disabled={loading || retryCount >= MAX_RETRIES}
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
                    onClick={handleResend}
                    className="w-full flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-2"
                >
                    <RefreshCcw size={10} /> 重新发送 / 修改邮箱
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