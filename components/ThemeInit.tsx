'use client';

import { useEffect } from 'react';

export default function ThemeInit() {
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem('theme') || 'light';
            const savedPreset = localStorage.getItem('theme-preset') || 'zinc';
            const savedHex = localStorage.getItem('theme-custom-hex') || '#18181b';

            // 1. Mode
            if (savedMode === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            // 2. Preset
            document.documentElement.setAttribute('data-theme', savedPreset);

            // 3. Custom Color
            if (savedPreset === 'custom') {
                // Hex to HSL
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(savedHex);
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

                    document.documentElement.style.setProperty('--primary', hslString);
                    document.documentElement.style.setProperty('--primary-foreground', l > 0.5 ? '0 0% 0%' : '0 0% 100%');
                    document.documentElement.style.setProperty('--ring', hslString);
                }
            } else {
                // Clean up custom styles if not using custom
                document.documentElement.style.removeProperty('--primary');
                document.documentElement.style.removeProperty('--primary-foreground');
                document.documentElement.style.removeProperty('--ring');
            }
        } catch (e) {
            console.error("Theme init failed", e);
        }
    }, []);

    return null;
}
