'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, LayoutGrid, Mail, ArrowRight, Check, RefreshCcw, AlertCircle, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- 组件：分体式 OTP 输入框 ---
const OTPInput = ({ length = 6, onComplete, disabled }: { length?: number, onComplete: (code: string) => void, disabled?: boolean }) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // 处理粘贴
    if (value.length > 1) {
        const pastedData = value.slice(0, length).split("");
        for (let i = 0; i < length; i++) {
            newOtp[i] = pastedData[i] || "";
        }
        setOtp(newOtp);
        onComplete(newOtp.join(""));
        inputRefs.current[length - 1]?.focus();
        return;
    }

    // 单个输入
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // 自动聚焦下一个
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (newOtp.every(v => v !== "")) {
        onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center my-6">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          maxLength={6} // 允许粘贴
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="w-10 h-12 sm:w-12 sm:h-14 border-2 border-zinc-200 rounded-xl text-center text-xl font-bold bg-zinc-50 focus:bg-white focus:border-zinc-900 focus:ring-0 outline-none transition-all disabled:opacity-50 caret-zinc-900"
        />
      ))}
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [countdown, setCountdown] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 5

  const router = useRouter()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    if(!email.includes('@') || !email.includes('.')) {
        setLoading(false)
        setErrorMsg('请输入有效的邮箱地址')
        return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    
    setLoading(false)
    if (error) {
        if (error.message.includes('Rate limit') || error.status === 429) {
            setErrorMsg('发送太频繁，请稍后 (60s)')
            setCountdown(60)
        } else {
            setErrorMsg(error.message)
        }
    } else {
        setStep('otp')
        setCountdown(60)
        setRetryCount(0)
    }
  }

  const handleVerifyOtp = async (code: string) => {
    if (retryCount >= MAX_RETRIES) {
        setErrorMsg('错误次数过多，请重新获取验证码')
        return
    }

    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
    })

    if (error) {
        setLoading(false)
        setRetryCount(prev => prev + 1)
        setErrorMsg(`验证码错误 (${MAX_RETRIES - retryCount - 1}次机会)`)
    } else {
        router.push('/')
        router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden border border-white">
        
        {step === 'otp' && (
            <button onClick={() => setStep('email')} className="absolute top-6 left-6 p-2 -ml-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
                <ChevronLeft size={20} />
            </button>
        )}

        <div className="flex flex-col items-center mb-8 mt-2">
            <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-900/20 mb-5 rotate-3 hover:rotate-6 transition-transform">
                <LayoutGrid size={26} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">TripSync</h1>
            <p className="text-sm text-zinc-400 font-medium mt-1">
                {step === 'email' ? '开启您的即兴旅程' : '安全验证'}
            </p>
        </div>

        {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">邮箱地址</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 text-zinc-400 group-focus-within:text-zinc-800 transition-colors" size={18}/>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="hello@example.com"
                            className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-base outline-none transition-all placeholder:text-zinc-400 font-medium"
                        />
                    </div>
                </div>

                <button 
                    disabled={loading || countdown > 0}
                    className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : (
                        countdown > 0 ? (
                            <span className="font-mono text-zinc-400">{countdown}s 后重试</span>
                        ) : (
                            <>下一步 <ArrowRight size={16}/></>
                        )
                    )}
                </button>
            </form>
        ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <p className="text-center text-sm text-zinc-500 mb-2">
                    验证码已发送至 <span className="font-bold text-zinc-900">{email}</span>
                </p>
                
                <OTPInput 
                    length={6} 
                    onComplete={handleVerifyOtp} 
                    disabled={loading}
                />

                <div className="h-6 flex justify-center items-center mb-6">
                     {loading && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin"/> 正在验证...</div>}
                </div>

                <button 
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                    <RefreshCcw size={12} /> {countdown > 0 ? `${countdown}s 后可重新获取` : '没有收到？重新发送'}
                </button>
            </div>
        )}

        {errorMsg && (
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-2 animate-in slide-in-from-bottom-2 shadow-sm">
                <AlertCircle size={16} className="flex-shrink-0"/>
                <span>{errorMsg}</span>
            </div>
        )}
      </div>
    </div>
  )
}