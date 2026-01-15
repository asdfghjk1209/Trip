'use client';

import SettingsSidebar from '@/components/SettingsSidebar';
import { ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Mobile Nav */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-zinc-500 hover:text-zinc-900 transition-colors"><ArrowLeft size={20} /></Link>
                    <h1 className="font-bold">设置</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-zinc-500">
                    <Menu size={20} />
                </button>
            </div>

            {/* Sidebar Component */}
            <SettingsSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen">
                <div className="max-w-4xl mx-auto p-6 md:p-12 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
