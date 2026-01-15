'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, Mail, User, Shield, Smartphone } from 'lucide-react';

export default function GeneralSettings() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // New States for Password & Device
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [deviceInfo, setDeviceInfo] = useState('');

    // Independent Profile Field Editing
    const [editingField, setEditingField] = useState<'email' | 'name' | null>(null);
    const [tempName, setTempName] = useState('');
    const [tempEmail, setTempEmail] = useState('');

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setTempName(user?.user_metadata?.full_name || '');
            setTempEmail(user?.email || '');
            setLoading(false);

            // Simple Device Detection
            const ua = navigator.userAgent;
            let os = "Unknown OS";
            if (ua.indexOf("Win") !== -1) os = "Windows";
            if (ua.indexOf("Mac") !== -1) os = "macOS";
            if (ua.indexOf("Linux") !== -1) os = "Linux";
            if (ua.indexOf("Android") !== -1) os = "Android";
            if (ua.indexOf("like Mac") !== -1) os = "iOS";

            let browser = "Unknown Browser";
            if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
            if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
            if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
            if (ua.indexOf("Edg") !== -1) browser = "Edge";

            setDeviceInfo(`${os} • ${browser}`);
        }
        initData();
    }, []);

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) return alert("密码长度至少为 6 位");
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);

        if (error) {
            alert("密码更新失败: " + error.message);
        } else {
            alert("密码已成功更新！请记住您的新密码。");
            setIsEditingPassword(false);
            setNewPassword('');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    }

    if (loading) return <div className="text-sm text-zinc-400">加载中...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold mb-1">通用设置</h2>
                <p className="text-zinc-500">管理您的账户和个人偏好。</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-6">个人信息</h3>

                <div className="flex flex-col items-center sm:items-start gap-8">
                    <div className="relative group cursor-pointer self-center sm:self-start" onClick={() => document.getElementById('avatar-upload')?.click()}>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-indigo-500/20 overflow-hidden ring-4 ring-white dark:ring-zinc-800 transition-transform group-hover:scale-105">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                            ) : (
                                user?.email?.[0]?.toUpperCase()
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold backdrop-blur-[2px]">
                            更换头像
                        </div>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 2 * 1024 * 1024) return alert('图片大小不能超过 2MB');
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                        const base64 = reader.result as string;
                                        setUser({ ...user, user_metadata: { ...user.user_metadata, avatar_url: base64 } });
                                        await supabase.auth.updateUser({ data: { avatar_url: base64 } });
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    <div className="w-full space-y-6">
                        {/* Email Field */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <Mail size={14} /> 邮箱地址
                                </label>
                                {editingField !== 'email' && (
                                    <button onClick={() => setEditingField('email')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                                        修改
                                    </button>
                                )}
                            </div>

                            {editingField === 'email' ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <input
                                        type="email"
                                        value={tempEmail}
                                        onChange={e => setTempEmail(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingField(null); setTempEmail(user?.email || ''); }} className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-700">取消</button>
                                        <button onClick={async () => {
                                            if (!tempEmail.includes('@')) return alert('邮箱格式不正确');
                                            if (tempEmail === user.email) return setEditingField(null);
                                            setLoading(true);
                                            const { error } = await supabase.auth.updateUser({ email: tempEmail });
                                            setLoading(false);
                                            if (error) alert(error.message);
                                            else {
                                                alert('请前往新旧邮箱查收确认邮件以完成修改！');
                                                setEditingField(null);
                                            }
                                        }} className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:opacity-90">
                                            {loading ? '发送中...' : '发送确认邮件'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 pl-1">{user?.email}</div>
                            )}
                        </div>

                        {/* Name Field */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <User size={14} /> 显示名称
                                </label>
                                {editingField !== 'name' && (
                                    <button onClick={() => setEditingField('name')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                                        修改
                                    </button>
                                )}
                            </div>

                            {editingField === 'name' ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <input
                                        type="text"
                                        value={tempName}
                                        onChange={e => setTempName(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingField(null); setTempName(user?.user_metadata?.full_name || ''); }} className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-700">取消</button>
                                        <button onClick={async () => {
                                            setLoading(true);
                                            const { error } = await supabase.auth.updateUser({ data: { full_name: tempName } });
                                            setLoading(false);
                                            if (error) alert(error.message);
                                            else {
                                                setUser({ ...user, user_metadata: { ...user.user_metadata, full_name: tempName } });
                                                setEditingField(null);
                                            }
                                        }} className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:opacity-90">
                                            {loading ? '保存中...' : '保存'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 pl-1">{user?.user_metadata?.full_name || '未设置'}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-6">登录与安全</h3>
                <div className="space-y-4">
                    {!isEditingPassword ? (
                        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">账户密码</div>
                                    <div className="text-xs text-zinc-500">如果未设置密码，请在此处设置。</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditingPassword(true)}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                                设置 / 修改密码
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500 ml-1">新密码</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="输入新密码 (至少 6 位)"
                                    className="w-full p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => { setIsEditingPassword(false); setNewPassword(''); }}
                                    className="px-3 py-1.5 text-zinc-500 text-xs font-bold hover:text-zinc-700 dark:hover:text-zinc-300"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={loading || newPassword.length < 6}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '更新中...' : '确认修改'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Device Management */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-6">设备管理</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Smartphone size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    当前设备
                                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded text-[10px]">在线</span>
                                </div>
                                <div className="text-xs text-zinc-500">{deviceInfo || '未知设备'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4">危险区域</h3>
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-sm text-red-700 dark:text-red-400">登出账户</h4>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70">登出当前设备。</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors shadow-sm"
                    >
                        <LogOut size={14} /> 退出登录
                    </button>
                </div>

                {/* Delete Account Row */}
                <div className="mt-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-sm text-red-700 dark:text-red-400">注销账户</h4>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70">永久删除您的账户及所有数据，此操作无法撤销。</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (window.confirm('确定要注销账户吗？您的所有行程和数据将被永久删除，无法恢复！')) {
                                setLoading(true);
                                const { error } = await supabase.rpc('delete_own_account');
                                if (error) {
                                    alert('注销失败: ' + error.message + '\n请确认您已在 Supabase 运行了最新的 schema.sql 脚本。');
                                    setLoading(false);
                                } else {
                                    alert('账户已注销，感谢您的使用。');
                                    await supabase.auth.signOut();
                                    router.push('/login');
                                }
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-500/20"
                    >
                        <Shield size={14} /> 确认注销
                    </button>
                </div>
            </div>
        </div>
    )
}
