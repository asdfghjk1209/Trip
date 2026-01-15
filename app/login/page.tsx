'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, LayoutGrid, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ChevronLeft, Check, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 常见邮箱后缀
const EMAIL_SUFFIXES = [
  'qq.com',
  '163.com',
  'gmail.com',
  'outlook.com',
  'icloud.com',
  'hotmail.com',
  'sina.com',
  'foxmail.com'
];

// --- 组件：OTP 输入框 ---
const OTPInput = ({ length = 6, onComplete, disabled, error }: { length?: number, onComplete: (code: string) => void, disabled?: boolean, error?: boolean }) => {
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
      if (newOtp.every(v => v !== "")) onComplete(newOtp.join(""));
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
    <div className="flex gap-2 sm:gap-3 justify-center my-6">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={cn(
            "w-10 h-12 sm:w-12 sm:h-14 border-2 rounded-xl text-center text-xl font-bold bg-zinc-50 focus:bg-white outline-none transition-all disabled:opacity-50 caret-zinc-900",
            error ? "border-red-300 focus:border-red-500 bg-red-50" : "border-zinc-200 focus:border-zinc-900",
            digit ? "border-zinc-900 bg-white" : ""
          )}
        />
      ))}
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info/Email, 2: OTP/Password

  // Form States
  const [loginInput, setLoginInput] = useState(''); // Can be email or name
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [nameExists, setNameExists] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  // OTP States
  const [countdown, setCountdown] = useState(0);

  // Password Validation
  const [passStrength, setPassStrength] = useState(0);

  useEffect(() => {
    validatePassword(password);
  }, [password]);

  // Countdown Timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Name Check
  useEffect(() => {
    if (mode === 'signup' && fullName.length > 2) {
      const timer = setTimeout(async () => {
        const { data } = await supabase.from('profiles').select('id').eq('full_name', fullName).single();
        setNameExists(!!data);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setNameExists(false);
    }
  }, [fullName, mode]);

  // Email Auto-complete Logic
  const handleEmailChange = (val: string) => {
    setEmail(val);
    const atIndex = val.indexOf('@');
    if (atIndex > -1) {
      const prefix = val.substring(0, atIndex);
      const suffix = val.substring(atIndex + 1);
      const matches = EMAIL_SUFFIXES.filter(s => s.startsWith(suffix)).map(s => `${prefix}@${s}`);
      setEmailSuggestions(matches);
    } else {
      setEmailSuggestions([]);
    }
  };

  const validatePassword = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    setPassStrength(score);
  };

  // --- Actions ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let targetEmail = loginInput;

      // If input is NOT an email (assuming it is a name), look up the email
      if (!loginInput.includes('@')) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('full_name', loginInput)
          .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple (though should be unique) or none

        if (error || !data || !data.email) {
          throw new Error('未找到该用户，请检查用户名是否正确');
        }
        targetEmail = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message === 'Invalid login credentials' ? '账号或密码错误' : err.message);
      setLoading(false);
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (passStrength < 5) return setErrorMsg("密码强度不足");
    if (password !== confirmPassword) return setErrorMsg("两次密码不一致");
    if (nameExists) return setErrorMsg("显示名称已被占用");
    setStep(2); // Go to Email
    setErrorMsg('');
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return setErrorMsg("无效的邮箱地址");

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw error;

      setStep(3);
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || '注册请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (code: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
      });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || '验证失败');
      setLoading(false);
    }
  };

  // --- Reset Password Flow ---
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      // 注意：Reset Password 通常发送的是链接，除非在 Supabase 开启 OTP 模式
      // 对于 Reset 流程，推荐 verifyOtp (type: 'recovery')
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setStep(2); // Move to OTP input
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (code: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery'
      });
      if (error) throw error;
      // 验证成功后，Session 建立，进入修改密码步骤 (Step 3)
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passStrength < 5) return setErrorMsg("新密码强度不足");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg("密码重置成功，正在登录...");
      setTimeout(() => {
        router.push('/');
        router.refresh(); // Refresh to update auth state
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    // Determine type based on mode
    const type = mode === 'reset' ? 'recovery' : 'signup';
    const { error } = await supabase.auth.resend({ type, email });
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else setCountdown(60);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 animate-in fade-in zoom-in-95 duration-500 relative overflow-visible border border-zinc-100">

        {/* Back Button */}
        {(step > 1 || mode === 'reset') && (
          <button onClick={() => {
            if (mode === 'reset' && step === 1) setMode('login');
            else setStep(step > 1 ? (step - 1 as 1 | 2 | 3) : 1);
          }} className="absolute top-6 left-6 p-2 -ml-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-900/20 mb-5">
            {mode === 'reset' ? <Lock size={26} strokeWidth={2.5} /> : <LayoutGrid size={26} strokeWidth={2.5} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TripSync</h1>
          <p className="text-sm text-zinc-400 font-medium mt-1">
            {mode === 'login' ? '欢迎回来，请登录' : (
              mode === 'reset' ? '重置密码' : (
                step === 1 ? '创建账户 - 基础信息' :
                  step === 2 ? '绑定邮箱' : '安全验证'
              )
            )}
          </p>
        </div>

        {/* Login/Signup Toggle */}
        {mode !== 'reset' && step === 1 && (
          <div className="flex p-1 bg-zinc-100 rounded-xl mb-6">
            <button onClick={() => setMode('login')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", mode === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>登录</button>
            <button onClick={() => setMode('signup')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", mode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>注册</button>
          </div>
        )}

        {/* --- LOGIN FORM --- */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-left-4 duration-300">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 ml-1">邮箱 / 显示名称</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                <input type="text" required value={loginInput} onChange={e => setLoginInput(e.target.value)} placeholder="hello@example.com 或 您的昵称" className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 ml-1">密码</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-12 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={async () => {
                  // Auto-fill logic
                  if (loginInput) {
                    if (loginInput.includes('@')) {
                      setEmail(loginInput);
                      setMode('reset');
                      setStep(1);
                    } else {
                      // Try to resolve name to email
                      setLoading(true);
                      const { data } = await supabase.from('profiles').select('email').eq('full_name', loginInput).maybeSingle();
                      setLoading(false);
                      if (data?.email) {
                        setEmail(data.email);
                        setMode('reset');
                        setStep(1);
                      } else {
                        // Fallback if name not found, usually just go to reset with empty email
                        setMode('reset');
                        setStep(1);
                        setEmail('');
                      }
                    }
                  } else {
                    setMode('reset');
                    setStep(1);
                    setEmail('');
                  }
                }} className="text-xs font-bold text-zinc-500 hover:text-zinc-900">忘记密码？</button>
              </div>
            </div>
            <button disabled={loading} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-4">
              {loading ? <Loader2 className="animate-spin" size={18} /> : '登录'}
            </button>
          </form>
        )}

        {/* --- RESET PASSWORD FLOW --- */}
        {mode === 'reset' && (
          <>
            {step === 1 && (
              <form onSubmit={handleResetRequest} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-zinc-500 ml-1">注册邮箱</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type="email" required value={email} onChange={e => handleEmailChange(e.target.value)} placeholder="hello@example.com" className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" />
                  </div>
                  {emailSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-zinc-100 z-10 overflow-hidden animate-in fade-in zoom-in-95">
                      {emailSuggestions.map(s => (
                        <button key={s} type="button" onClick={() => { setEmail(s); setEmailSuggestions([]); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 flex items-center gap-2">
                          <Mail size={14} className="opacity-50" /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button disabled={loading} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all flex items-center justify-center gap-2 mt-4">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : '获取验证码'}
                </button>
              </form>
            )}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300 text-center">
                <p className="text-sm text-zinc-500 mb-2">已发送 6 位验证码至</p>
                <p className="font-bold text-zinc-900 text-lg mb-6">{email}</p>

                {/* 提示用户查看邮件 */}
                <p className="text-xs text-zinc-400 mb-4 px-8">请查看收件箱（包括垃圾邮件），输入邮件中的验证码。不要点击邮件链接。</p>

                <OTPInput length={6} onComplete={handleVerifyReset} disabled={loading} error={!!errorMsg} />

                <div className="h-6 flex justify-center items-center mb-6">
                  {loading && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> 正在验证...</div>}
                </div>
                <button type="button" onClick={handleResendOtp} disabled={countdown > 0} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors">
                  <RefreshCcw size={12} /> {countdown > 0 ? `${countdown}s 后可重新获取` : '没有收到？重新发送'}
                </button>
              </div>
            )}
            {step === 3 && (
              <form onSubmit={handleUpdatePassword} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 ml-1 flex justify-between">
                    设置新密码 <span className={cn("transition-colors", passStrength === 5 ? "text-green-500" : "text-zinc-400")}>强度: {['弱', '弱', '中', '良', '强', '完美'][passStrength]}</span>
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="8位以上, 大小写+数字+符号" className="w-full pl-11 pr-12 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <button disabled={loading} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all flex items-center justify-center gap-2 mt-4">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : '确认修改密码'}
                </button>
              </form>
            )}
          </>
        )}

        {/* --- SIGNUP WIZARD --- */}
        {mode === 'signup' && (
          <>
            {/* STEP 1: Name & Password */}
            {step === 1 && (
              <form onSubmit={handleSignupStep1} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 ml-1">显示名称</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="您的昵称" className={cn("w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 rounded-2xl text-sm font-medium outline-none transition-all focus:bg-white focus:border-zinc-900", nameExists ? "border-red-300 focus:border-red-500" : "border-transparent")} />
                    {nameExists && <span className="absolute right-4 top-3.5 text-xs text-red-500 font-bold">已存在</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 ml-1 flex justify-between">
                    密码 <span className={cn("transition-colors", passStrength === 5 ? "text-green-500" : "text-zinc-400")}>强度: {['弱', '弱', '中', '良', '强', '完美'][passStrength]}</span>
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="8位以上, 大小写+数字+符号" className="w-full pl-11 pr-12 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 ml-1">确认密码</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入密码" className={cn("w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 rounded-2xl text-sm font-medium outline-none transition-all focus:bg-white focus:border-zinc-900", password && confirmPassword && password !== confirmPassword ? "border-red-300" : "border-transparent")} />
                  </div>
                </div>
                <button className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all flex items-center justify-center gap-2 mt-4">
                  下一步 <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: Email */}
            {step === 2 && (
              <form onSubmit={handleSignupStep2} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-zinc-500 ml-1">绑定邮箱</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input type="email" required value={email} onChange={e => handleEmailChange(e.target.value)} placeholder="hello@example.com" className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-2 border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded-2xl text-sm font-medium outline-none transition-all" autoFocus />
                  </div>

                  {/* Email Suggestions */}
                  {emailSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-zinc-100 z-10 overflow-hidden animate-in fade-in zoom-in-95">
                      {emailSuggestions.map(s => (
                        <button key={s} type="button" onClick={() => { setEmail(s); setEmailSuggestions([]); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 flex items-center gap-2">
                          <Mail size={14} className="opacity-50" /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button disabled={loading} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all flex items-center justify-center gap-2 mt-8">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <>发送验证码 <Mail size={16} /></>}
                </button>
              </form>
            )}

            {/* STEP 3: OTP */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300 text-center">
                <p className="text-sm text-zinc-500 mb-2">已发送 6 位验证码至</p>
                <p className="font-bold text-zinc-900 text-lg mb-6">{email}</p>

                <OTPInput length={6} onComplete={handleVerifySignup} disabled={loading} error={!!errorMsg} />

                <div className="h-6 flex justify-center items-center mb-6">
                  {loading && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> 正在验证...</div>}
                </div>

                <button type="button" onClick={handleResendOtp} disabled={countdown > 0} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors">
                  <RefreshCcw size={12} /> {countdown > 0 ? `${countdown}s 后可重新获取` : '没有收到？重新发送'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-2 animate-in slide-in-from-bottom-2 shadow-xl">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-green-50 text-green-600 text-xs font-medium border border-green-100 flex items-center gap-2 animate-in slide-in-from-bottom-2 shadow-xl">
            <Check size={16} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}