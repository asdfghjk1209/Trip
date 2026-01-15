'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function NotificationsSettings() {
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        email_updates: true,
        push_invites: true,
        push_comments: true,
        marketing: false
    });

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase
                    .from('profiles')
                    .select('notification_settings')
                    .eq('id', user.id)
                    .single();

                if (data?.notification_settings) {
                    setSettings(prev => ({ ...prev, ...data.notification_settings }));
                }
            }
            setLoading(false);
        })();
    }, []);

    const toggle = async (key: keyof typeof settings) => {
        const newVal = !settings[key];
        const newSettings = { ...settings, [key]: newVal };

        // Optimistic Update
        setSettings(newSettings);

        if (userId) {
            const { error } = await supabase
                .from('profiles')
                .update({ notification_settings: newSettings })
                .eq('id', userId);

            if (error) {
                console.error('Failed to update notification settings', error);
                // Revert on error
                setSettings(prev => ({ ...prev, [key]: !newVal }));
                alert('设置保存失败，请重试');
            }
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-400" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-2xl font-bold mb-1">通知推送</h2>
                <p className="text-zinc-500">选择您希望接收哪些类型的通知。</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                        <Mail size={16} className="text-indigo-500" /> 邮件通知
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">行程更新</div>
                            <div className="text-xs text-zinc-500">当您的行程计划发生重要变更时。</div>
                        </div>
                        <Switch checked={settings.email_updates} onChange={() => toggle('email_updates')} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                        <Smartphone size={16} className="text-indigo-500" /> 推送通知
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">协作邀请</div>
                            <div className="text-xs text-zinc-500">当有人邀请您加入行程时。</div>
                        </div>
                        <Switch checked={settings.push_invites} onChange={() => toggle('push_invites')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">新评论与留言</div>
                            <div className="text-xs text-zinc-500">当有人在这一刻中提及您或评论时。</div>
                        </div>
                        <Switch checked={settings.push_comments} onChange={() => toggle('push_comments')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                checked ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
            )}
        >
            <span
                className={cn(
                    "block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 absolute top-1 left-1",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    )
}
