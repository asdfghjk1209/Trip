'use client';

import { useState, useEffect, Suspense } from 'react';
import { Check, Moon, Sun, Monitor, RefreshCw, Undo, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ Default Themes (Presets)
const THEME_PRESETS = [
    { id: 'zinc', name: '锌灰 (默认)', primary: '240 5.9% 10%', primaryFg: '0 0% 98%' }, // Zinc-900
    { id: 'ocean', name: '海洋蓝', primary: '221 83% 53%', primaryFg: '210 40% 98%' }, // Blue-500
    { id: 'rose', name: '玫瑰红', primary: '346 84% 61%', primaryFg: '355 100% 97%' },  // Rose-500
    { id: 'orange', name: '落日橙', primary: '24 95% 53%', primaryFg: '20 100% 97%' }, // Orange-500
    { id: 'green', name: '森林绿', primary: '142 71% 45%', primaryFg: '138 76% 97%' }, // Green-600
    { id: 'violet', name: '电光紫', primary: '262 83% 58%', primaryFg: '266 100% 97%' }, // Violet-600
];

export default function AppearancePage() {
    return (
        <Suspense fallback={<div>Loading settings...</div>}>
            <AppearanceContent />
        </Suspense>
    );
}

function AppearanceContent() {
    // Initial / Persisted State
    const [initialState, setInitialState] = useState({
        mode: 'light' as 'light' | 'dark',
        preset: 'zinc',
        customHex: '#18181b'
    });

    // Staged State (Changes not yet applied)
    const [stagedState, setStagedState] = useState({
        mode: 'light' as 'light' | 'dark',
        preset: 'zinc',
        customHex: '#18181b'
    });

    const [hasChanges, setHasChanges] = useState(false);

    // Initialize logic
    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        const savedPreset = localStorage.getItem('theme-preset') || 'zinc';
        const savedHex = localStorage.getItem('theme-custom-hex') || '#18181b';

        const state = {
            mode: isDark ? 'dark' : 'light' as 'light' | 'dark',
            preset: savedPreset,
            customHex: savedHex
        };
        setInitialState(state);
        setStagedState(state);
    }, []);

    // Check for changes
    useEffect(() => {
        const changed =
            stagedState.mode !== initialState.mode ||
            stagedState.preset !== initialState.preset ||
            (stagedState.preset === 'custom' && stagedState.customHex !== initialState.customHex);
        setHasChanges(changed);
    }, [stagedState, initialState]);

    // Apply logic (Shared)
    const applyThemeToDom = (mode: string, preset: string, hex: string) => {
        // 1. Mode
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 2. Preset / Color
        document.documentElement.setAttribute('data-theme', preset);

        if (preset === 'custom') {
            // Hex to HSL
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (result) {
                let r = parseInt(result[1], 16) / 255;
                let g = parseInt(result[2], 16) / 255;
                let b = parseInt(result[3], 16) / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                const hslString = `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;

                // IMPORTANT: Use setProperty with priority if needed, or ensure cleanup
                document.documentElement.style.setProperty('--primary', hslString);
                document.documentElement.style.setProperty('--primary-foreground', l > 0.5 ? '0 0% 0%' : '0 0% 100%');
                document.documentElement.style.setProperty('--ring', hslString);
            }
        } else {
            // Clean up custom styles if active
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--primary-foreground');
            document.documentElement.style.removeProperty('--ring');
        }
    };

    const handleSave = () => {
        // Persist
        localStorage.setItem('theme', stagedState.mode);
        localStorage.setItem('theme-preset', stagedState.preset);
        if (stagedState.preset === 'custom') {
            localStorage.setItem('theme-custom-hex', stagedState.customHex);
        }

        // Apply
        applyThemeToDom(stagedState.mode, stagedState.preset, stagedState.customHex);

        // Update initial state
        setInitialState(stagedState);
        setHasChanges(false);
        alert('设置已保存');
    };

    const handleReset = () => {
        setStagedState(initialState);
        // Re-apply initial state to DOM in case user previewed something? 
        // Currently we don't live preview. We only stage.
    };

    const handleResetAll = () => {
        const defaultState = { mode: 'light' as 'light' | 'dark', preset: 'zinc', customHex: '#18181b' };
        setStagedState(defaultState);
    };

    return (
        <div className="space-y-10 pb-20">
            <div>
                <h2 className="text-2xl font-bold mb-1">外观 & 主题</h2>
                <p className="text-zinc-500">自定义显示方式。修改后请点击保存。</p>
            </div>

            {/* Mode Toggle */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">界面主题</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <button
                        onClick={() => setStagedState(s => ({ ...s, mode: 'light' }))}
                        className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all", stagedState.mode === 'light' ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300")}
                    >
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", stagedState.mode === 'light' ? "bg-white text-indigo-600 shadow-sm" : "bg-zinc-100 text-zinc-400")}>
                            <Sun size={20} />
                        </div>
                        <span className="font-medium text-sm">浅色模式</span>
                    </button>
                    <button
                        onClick={() => setStagedState(s => ({ ...s, mode: 'dark' }))}
                        className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all", stagedState.mode === 'dark' ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300")}
                    >
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", stagedState.mode === 'dark' ? "bg-zinc-800 text-white shadow-sm" : "bg-zinc-100 text-zinc-400")}>
                            <Moon size={20} />
                        </div>
                        <span className="font-medium text-sm">深色模式</span>
                    </button>
                </div>
            </section>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Primary Color Presets */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">强调色</h3>
                <p className="text-sm text-zinc-500 mb-4">选择用于按钮、链接和激活状态的主题色。</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {THEME_PRESETS.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => setStagedState(s => ({ ...s, preset: preset.id }))}
                            className={cn(
                                "group relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                stagedState.preset === preset.id ? "border-zinc-900 dark:border-white" : "border-transparent bg-white dark:bg-zinc-900 shadow-sm"
                            )}
                        >
                            <div
                                className="w-8 h-8 rounded-full shadow-inner border border-black/5"
                                style={{ backgroundColor: `hsl(${preset.primary})` }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs truncate">{preset.name}</div>
                            </div>
                            {stagedState.preset === preset.id && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-zinc-900 dark:bg-white"></div>}
                        </button>
                    ))}
                </div>
            </section>

            {/* Custom Color */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">自定义颜色</h3>
                    {stagedState.preset === 'custom' && (
                        <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full text-zinc-500 font-mono">{stagedState.customHex}</span>
                    )}
                </div>
                <div className={cn("flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border rounded-xl relative overflow-hidden transition-colors", stagedState.preset === 'custom' ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-zinc-200 dark:border-zinc-800")}>
                    <input
                        type="color"
                        value={stagedState.customHex}
                        onChange={(e) => setStagedState(s => ({ ...s, customHex: e.target.value, preset: 'custom' }))}
                        className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                    />
                    <div className="flex-1">
                        <div className="font-bold text-sm">选择颜色</div>
                        <div className="text-xs text-zinc-500">点击左侧色块选择。</div>
                    </div>
                </div>
            </section>

            {/* Action Bar */}
            <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[calc(16rem+2rem)] right-8 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between transition-all duration-300 transform", hasChanges ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none")}>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">有未保存的更改</span>
                    <button onClick={handleReset} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-500 transition-colors" title="还原更改">
                        <Undo size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleResetAll} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                        重置所有
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
                        <Save size={16} /> 保存应用
                    </button>
                </div>
            </div>
            <div className="h-16"></div>
        </div>
    )
}
