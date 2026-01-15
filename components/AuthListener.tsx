'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthListener() {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event:", event);
            if (event === 'PASSWORD_RECOVERY') {
                // 用户点击了重置密码邮件链接，且 Session 已建立
                // 引导至重置密码页面
                router.push('/reset-password');
            }
        });

        return () => {
            subscription.unsubscribe();
        }
    }, [router]);

    return null;
}
