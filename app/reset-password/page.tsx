'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) return alert("密码长度至少为 6 位");

        setLoading(true);
        // 更新当前登录用户的密码
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            alert("重置失败: " + error.message);
        } else {
            alert("密码已重置成功！正在跳转...");
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                        <Lock size={26} />
                    </div>
                    <h1 className="text-2xl font-bold">设置新密码</h1>
                    <p className="text-sm text-zinc-500 mt-1">请输入您的新密码以完成重置。</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-5">
                    <div className="space-y-1.5">
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="输入新密码"
                                className="w-full px-4 py-3 bg-zinc-50 border-2 border-transparent focus:bg-white focus:border-indigo-600 rounded-xl outline-none transition-all"
                                autoFocus
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : '确认修改'}
                    </button>
                </form>
            </div>
        </div>
    );
}
