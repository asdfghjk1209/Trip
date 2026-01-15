'use client';

import { X, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean; // If true, confirm button is red
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    content,
    confirmText = "确定",
    cancelText = "取消",
    isDanger = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            ></div>

            {/* Modal Content */}
            <div
                className={`
                    relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl 
                    border border-zinc-100 dark:border-zinc-800 p-6 
                    transition-all duration-300 transform
                    ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
                `}
            >
                <div className="flex items-start gap-4 mb-4">
                    {isDanger && (
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-500">
                            <AlertTriangle size={20} />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {content}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`
                            px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all active:scale-95
                            ${isDanger
                                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'}
                        `}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
