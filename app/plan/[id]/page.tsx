'use client'

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SortableItem } from "@/components/SortableItem";
import UserMenu from "@/components/UserMenu";
import {
    ArrowLeft, Plane, Map as MapIcon, Image as ImageIcon,
    Share2, PenLine, PieChart, TrendingDown,
    ChevronLeft, ChevronRight, GripVertical, Plus, CalendarDays, MapPin,
    TrainFront, BedDouble, Utensils, Camera, Info,
    X, Loader2, Trash2, Check, AlertTriangle,
    Heart, MessageCircle, CheckSquare, Briefcase, Shirt, Sparkles,
    Eye, ListTodo, Download, QrCode, Palette, Maximize2
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from "@/lib/utils";
import { toPng } from 'html-to-image';

// --- 动态组件 ---
const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-zinc-100 animate-pulse rounded-xl flex items-center justify-center text-zinc-400 text-xs">地图加载中...</div>
});

// --- 类型定义 ---
interface Trip {
    id: number;
    title: string;
    cover_image: string | null;
    start_date: string;
    budget_limit?: number;
    user_id?: string;
    is_public?: boolean;
}
interface Day { id: number; day_index: number; title: string; date?: string; }
interface Activity {
    id: number; title: string; location: string; time: string; lat: number; lng: number; sort_order: number;
    type: string; is_tentative: boolean; images: string[]; memo?: string; cost?: number; link?: string;
}
interface ChecklistItem { id: number; text: string; done: boolean; }
interface ChecklistCategory { id: string; title: string; items: ChecklistItem[]; }

// --- 样式配置 ---
const TYPE_CONFIG: Record<string, {
    color: string, bg: string, border: string, ring: string, icon: any, label: string,
    barColor: string, badgeBg: string, badgeText: string
}> = {
    flight: {
        color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-100',
        icon: Plane, label: '航班',
        barColor: 'bg-blue-500', badgeBg: 'bg-blue-50', badgeText: 'text-blue-600'
    },
    transport: {
        color: 'text-primary', bg: 'bg-indigo-50', border: 'border-indigo-200', ring: 'ring-indigo-100',
        icon: TrainFront, label: '交通',
        barColor: 'bg-indigo-500', badgeBg: 'bg-indigo-50', badgeText: 'text-primary'
    },
    rest: {
        color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-100',
        icon: BedDouble, label: '住宿',
        barColor: 'bg-rose-500', badgeBg: 'bg-rose-50', badgeText: 'text-rose-600'
    },
    food: {
        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-100',
        icon: Utensils, label: '餐饮',
        barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600'
    },
    spot: {
        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-100',
        icon: Camera, label: '景点',
        barColor: 'bg-amber-500', badgeBg: 'bg-amber-50', badgeText: 'text-amber-600'
    },
    other: {
        color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', ring: 'ring-slate-100',
        icon: MapPin, label: '其他',
        barColor: 'bg-slate-500', badgeBg: 'bg-slate-50', badgeText: 'text-slate-600'
    },
};

// --- UI 工具组件 ---
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) {
    useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
    const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-primary' : 'bg-blue-500';
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-2 fade-in">
            <div className={cn("px-4 py-3 rounded-full shadow-xl flex items-center gap-2 text-white text-sm font-medium", bg)}>
                {type === 'success' ? <Check size={14} strokeWidth={3} /> : type === 'error' ? <AlertTriangle size={14} /> : <Info size={14} />}
                {message}
            </div>
        </div>
    );
}

// 🌟 地点搜索组件 (国内优化版)
function LocationSearch({ value, onChange, onSelect }: { value: string, onChange: (val: string) => void, onSelect: (data: { lat: number, lng: number, address: string }) => void }) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.length > 1 && showDropdown) {
                setLoading(true);
                try {
                    // 使用后端代理 API，支持高德/OSM自动切换
                    const res = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuggestions(data);
                    }
                } catch (e) {
                    console.error('Search failed:', e);
                } finally {
                    setLoading(false);
                }
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [value, showDropdown]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-zinc-400" />
                <input
                    type="text"
                    value={value}
                    onFocus={() => setShowDropdown(true)}
                    onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
                    placeholder="搜地点 (如: 成都 春熙路)..."
                    className="w-full p-3 pl-9 bg-background rounded-xl border-none outline-none focus:ring-2 focus:ring-zinc-200 text-sm"
                />
                {loading && <Loader2 size={14} className="absolute right-3 top-3.5 animate-spin text-zinc-400" />}
            </div>
            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-zinc-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
                    {suggestions.map((item, idx) => {
                        return (
                            <div key={idx} onClick={() => {
                                onChange(item.name);
                                onSelect({ lat: item.lat, lng: item.lng, address: item.address });
                                setShowDropdown(false);
                            }}
                                className="p-3 hover:bg-background cursor-pointer border-b border-zinc-50 last:border-0">
                                <div className="font-medium text-sm text-zinc-800 flex justify-between items-center">
                                    <span>{item.name}</span>
                                    {item.source === 'amap' && <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 py-0.5 rounded ml-2">高德</span>}
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate mt-0.5">{item.address}</div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}

// 🌟 海报导出组件
function ExportModal({ trip, day, activities, onClose, showToast }: any) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [theme, setTheme] = useState<'modern' | 'classic' | 'night'>('modern');

    const totalCost = activities.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);
    const spotCount = activities.filter((i: any) => i.type === 'spot').length;
    const foodCount = activities.filter((i: any) => i.type === 'food').length;

    const handleDownload = async () => {
        if (!contentRef.current) return;
        setIsGenerating(true);
        try {
            await document.fonts.ready;
            const dataUrl = await toPng(contentRef.current, { pixelRatio: 3, cacheBust: true });
            const link = document.createElement('a');
            link.download = `TripSync-${trip.title}-${day.title}.png`;
            link.href = dataUrl;
            link.click();
            showToast('高清海报已保存！', 'success');
        } catch (err) {
            console.error(err);
            showToast('生成失败，请重试', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const THEMES = {
        modern: { bg: 'bg-white', paper: 'bg-zinc-50', text: 'text-zinc-900', accent: 'bg-primary', accentText: 'text-primary', line: 'bg-indigo-100', dot: 'border-primary' },
        classic: { bg: 'bg-[#F2F0E9]', paper: 'bg-[#FAF9F6]', text: 'text-[#2C2C2C]', accent: 'bg-[#C65D47]', accentText: 'text-[#C65D47]', line: 'bg-[#E5DCC5]', dot: 'border-[#C65D47]' },
        night: { bg: 'bg-zinc-900', paper: 'bg-zinc-800', text: 'text-white', accent: 'bg-sky-500', accentText: 'text-sky-400', line: 'bg-zinc-700', dot: 'border-sky-500' }
    };
    const t = THEMES[theme];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="flex flex-col md:flex-row h-[90vh] max-w-5xl w-full bg-primary rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full md:w-80 bg-zinc-800 border-r border-zinc-700 flex flex-col">
                    <div className="p-6 border-b border-zinc-700 flex justify-between items-center text-white">
                        <h3 className="font-bold text-lg">导出攻略图</h3>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-700 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 block flex items-center gap-2"><Palette size={14} /> 风格选择</label>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={() => setTheme('modern')} className={cn("p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3", theme === 'modern' ? "border-indigo-500 bg-zinc-700" : "border-transparent bg-zinc-700/50 hover:bg-zinc-700")}><div className="w-8 h-8 rounded-full bg-white border-4 border-zinc-100"></div><div className="text-white"><div className="font-bold text-sm">现代白</div><div className="text-[10px] text-zinc-400">Clean & Modern</div></div></button>
                                <button onClick={() => setTheme('classic')} className={cn("p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3", theme === 'classic' ? "border-[#C65D47] bg-zinc-700" : "border-transparent bg-zinc-700/50 hover:bg-zinc-700")}><div className="w-8 h-8 rounded-full bg-[#F2F0E9] border-4 border-[#C65D47]"></div><div className="text-white"><div className="font-bold text-sm">杂志风</div><div className="text-[10px] text-zinc-400">Classic Magazine</div></div></button>
                                <button onClick={() => setTheme('night')} className={cn("p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3", theme === 'night' ? "border-sky-500 bg-zinc-700" : "border-transparent bg-zinc-700/50 hover:bg-zinc-700")}><div className="w-8 h-8 rounded-full bg-[#0F172A] border-4 border-sky-500"></div><div className="text-white"><div className="font-bold text-sm">极客黑</div><div className="text-[10px] text-zinc-400">Dark Mode</div></div></button>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-zinc-700 bg-zinc-800">
                        <button onClick={handleDownload} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-900/50">
                            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} {isGenerating ? '正在渲染...' : '保存高清长图'}
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-zinc-950 overflow-y-auto p-8 flex justify-center">
                    <div ref={contentRef} className={cn("w-[390px] min-h-[800px] shadow-2xl relative flex flex-col", t.bg)}>
                        <div className="relative h-64 w-full overflow-hidden rounded-b-[40px] shadow-lg z-10">
                            <img src={trip.cover_image} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute top-6 left-6 text-white/90 text-xs font-bold tracking-[0.2em] uppercase border border-white/30 px-3 py-1 rounded-full backdrop-blur-md">行程指南</div>
                            <div className="absolute bottom-8 left-6 right-6 text-white">
                                <h1 className="text-3xl font-bold leading-tight mb-2 drop-shadow-md">{trip.title}</h1>
                                <div className="flex items-center gap-3 text-sm font-medium opacity-90"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> {day.title}</span><span className="w-1 h-1 rounded-full bg-white/60"></span><span>{new Date(trip.start_date).toLocaleDateString()}</span></div>
                            </div>
                        </div>
                        <div className="px-6 -mt-6 relative z-20 flex gap-3">
                            <div className={cn("flex-1 p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1", t.paper)}><div className={cn("text-[10px] font-bold uppercase tracking-wider opacity-60", t.text)}>预算</div><div className={cn("text-lg font-bold flex items-center gap-0.5", t.text)}><span className="text-xs">¥</span>{totalCost.toLocaleString()}</div></div>
                            <div className={cn("flex-1 p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1", t.paper)}><div className={cn("text-[10px] font-bold uppercase tracking-wider opacity-60", t.text)}>景点</div><div className={cn("text-lg font-bold", t.text)}>{spotCount}</div></div>
                            <div className={cn("flex-1 p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1", t.paper)}><div className={cn("text-[10px] font-bold uppercase tracking-wider opacity-60", t.text)}>美食</div><div className={cn("text-lg font-bold", t.text)}>{foodCount}</div></div>
                        </div>
                        <div className="flex-1 px-6 py-8 relative">
                            <div className={cn("absolute left-[41px] top-12 bottom-12 w-[2px] border-l-2 border-dashed", theme === 'night' ? 'border-slate-700' : 'border-slate-300')}></div>
                            {activities.map((item: Activity, idx: number) => {
                                const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                                return (
                                    <div key={idx} className="relative flex gap-5 mb-8 last:mb-0">
                                        <div className="flex flex-col items-center flex-shrink-0 w-8 z-10"><div className={cn("text-[11px] font-bold font-mono mb-2", t.accentText)}>{item.time}</div><div className={cn("w-3.5 h-3.5 rounded-full border-[3px] shadow-sm bg-white", t.dot)}></div></div>
                                        <div className={cn("flex-1 p-4 rounded-2xl shadow-sm border", t.paper, theme === 'night' ? 'border-slate-700' : 'border-slate-100')}>
                                            <div className="flex justify-between items-start mb-2"><h4 className={cn("font-bold text-[15px] leading-tight", t.text)}>{item.title}</h4>{item.cost && item.cost > 0 && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded opacity-80", theme === 'night' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600')}>¥{item.cost}</span>}</div>
                                            <div className="flex items-center gap-2 mb-3"><span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide", theme === 'night' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500')}>{typeCfg.label}</span><span className={cn("text-[10px] flex items-center gap-0.5 truncate max-w-[120px] opacity-60", t.text)}><MapPin size={10} /> {item.location}</span></div>
                                            {item.memo && (<div className={cn("text-[11px] leading-relaxed p-2.5 rounded-xl mb-3 border", theme === 'night' ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-[#F8F9FA] border-slate-100 text-slate-600')}>{item.memo}</div>)}
                                            {item.images?.length > 0 && (<div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">{item.images.slice(0, 2).map((img, i) => (<img key={i} src={img} className={cn("w-full h-20 object-cover", item.images.length === 1 && "col-span-2 h-32")} crossOrigin="anonymous" />))}</div>)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={cn("mt-auto px-6 py-8 border-t border-dashed flex items-center justify-between", theme === 'night' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50')}>
                            <div><div className={cn("font-bold text-lg flex items-center gap-2", t.text)}><div className={cn("w-6 h-6 rounded flex items-center justify-center text-white", t.accent)}><Plane size={12} /></div>TripSync</div><div className={cn("text-[10px] mt-1 opacity-50", t.text)}>扫描二维码查看完整地图 & 导航</div></div>
                            <div className="w-16 h-16 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100"><div className="w-full h-full border border-slate-100 rounded bg-slate-50 flex items-center justify-center"><QrCode size={32} className="text-slate-800" /></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const TABS = [
    { id: 'timeline', label: '行程规划', icon: MapIcon },
    { id: 'memories', label: '回忆 & 灵感', icon: Sparkles },
    { id: 'checklist', label: '行前清单', icon: CheckSquare }
];

// Mock Import Modal
function ImportBudgetModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">导入账单</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-3 mb-6">
                    <button onClick={() => alert("微信账单解析功能开发中...")} className="w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-[#07C160]/10 flex items-center justify-center text-[#07C160]"><QrCode size={16} /></div>
                        <div className="text-left">
                            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-[#07C160] transition-colors">微信账单 (CSV/图片)</div>
                            <div className="text-[10px] text-zinc-400">支持导入聊天记录或账单截图</div>
                        </div>
                    </button>
                    <button onClick={() => alert("支付宝账单解析功能开发中...")} className="w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-[#1677FF]/10 flex items-center justify-center text-[#1677FF]"><QrCode size={16} /></div>
                        <div className="text-left">
                            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-[#1677FF] transition-colors">支付宝账单</div>
                            <div className="text-[10px] text-zinc-400">自动识别交易记录</div>
                        </div>
                    </button>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs text-zinc-500 leading-relaxed mb-4">
                    <Info size={12} className="inline mr-1 -mt-0.5" />
                    为了您的隐私安全，所有数据将在本地进行解析处理，不会上传至服务器。
                </div>
            </div>
        </div>
    )
}

export default function PlanDetail() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.id;

    // Data State
    const [trip, setTrip] = useState<Trip | null>(null);
    const [days, setDays] = useState<Day[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMember, setIsMember] = useState(false);

    // Checklist State (Mock Data)
    const [checklistCategories, setChecklistCategories] = useState<ChecklistCategory[]>([
        { id: 'docs', title: '证件 & 文件', items: [{ id: 1, text: '护照', done: true }, { id: 2, text: '签证复印件', done: false }, { id: 3, text: '酒店确认单', done: false }] },
        { id: 'clothes', title: '衣物', items: [{ id: 4, text: '外套', done: false }, { id: 5, text: '睡衣', done: true }] },
        { id: 'elec', title: '电子产品', items: [{ id: 6, text: '充电宝', done: false }, { id: 7, text: '转换插头', done: false }, { id: 8, text: '相机', done: true }] },
        { id: 'todo', title: '待办事项', items: [{ id: 9, text: '购买 JR Pass', done: false }, { id: 10, text: '预订随身 WiFi', done: false }] }
    ]);

    // UI State
    const [currentDayIdx, setCurrentDayIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('timeline');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showBudgetImport, setShowBudgetImport] = useState(false);
    const [showFullMap, setShowFullMap] = useState(false);

    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, desc: string, isDestructive: boolean, onConfirm: () => void }>({
        isOpen: false, title: '', desc: '', isDestructive: false, onConfirm: () => { }
    });

    const totalCost = activities.reduce((sum, item) => sum + (item.cost || 0), 0);
    const budgetLimit = trip?.budget_limit || 50000;
    const budgetPercent = Math.min(100, Math.round((totalCost / budgetLimit) * 100));
    const isOwner = currentUser && trip && currentUser.id === trip.user_id;
    const canEdit = isOwner || isMember;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ msg, type });

    const initData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', tripId).single();
        if (error) { setLoading(false); return; }
        setTrip(tripData);
        if (user && tripData.user_id !== user.id) {
            const { data: memberData } = await supabase.from('trip_members').select('*').eq('trip_id', tripId).eq('email', user.email).single();
            if (memberData) setIsMember(true);
        }
        let { data: daysData } = await supabase.from('days').select('*').eq('trip_id', tripId).order('day_index', { ascending: true });
        if (!daysData || daysData.length === 0) {
            const { data: newDay } = await supabase.from('days').insert([{ trip_id: tripId, day_index: 0, title: 'Day 1' }]).select();
            daysData = newDay || [];
        }
        setDays(daysData as Day[]);
        setLoading(false);
    }, [tripId]);

    const fetchActivities = useCallback(async () => {
        if (!days[currentDayIdx]) return;
        const { data } = await supabase.from('activities').select('*').eq('day_id', days[currentDayIdx].id).order('sort_order', { ascending: true });
        if (data) setActivities(data as Activity[]);
    }, [days, currentDayIdx]);

    useEffect(() => { initData(); }, [initData]);
    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

    const handleSaveActivity = async (data: any) => {
        setShowModal(false);
        if (editingActivity) {
            setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...data } : a));
            await supabase.from('activities').update({ ...data }).eq('id', editingActivity.id);
            showToast('活动已更新', 'success');
        } else {
            const newTempActivity = { id: Date.now(), day_id: days[currentDayIdx].id, sort_order: activities.length, is_tentative: false, images: [], ...data };
            setActivities(prev => [...prev, newTempActivity]);
            await supabase.from('activities').insert([{ day_id: days[currentDayIdx].id, sort_order: activities.length, is_tentative: false, ...data }]);
            showToast('新活动已添加', 'success');
            fetchActivities();
        }
    };

    const handleDeleteRequest = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setConfirmState({
            isOpen: true, title: '删除此活动？', desc: '删除后无法恢复，确定要将该活动从行程中移除吗？', isDestructive: true,
            onConfirm: async () => {
                setActivities(prev => prev.filter(a => a.id !== id));
                await supabase.from('activities').delete().eq('id', id);
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                showToast('活动已删除', 'success');
            }
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!canEdit) return;
        const { active, over } = event;
        if (active.id !== over?.id) {
            setActivities((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Checklist Handlers ---
    const toggleChecklistItem = (catId: string, itemId: number) => {
        setChecklistCategories(cats => cats.map(cat =>
            cat.id === catId ? { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : cat
        ));
    };

    const addChecklistItem = (catId: string) => {
        const text = prompt("请输入新的清单项名称：");
        if (text) {
            setChecklistCategories(cats => cats.map(cat =>
                cat.id === catId ? { ...cat, items: [...cat.items, { id: Date.now(), text, done: false }] } : cat
            ));
            showToast('已添加清单项', 'success');
        }
    };

    const deleteChecklistItem = (catId: string, itemId: number) => {
        if (confirm('确定要删除此项吗？')) {
            setChecklistCategories(cats => cats.map(cat =>
                cat.id === catId ? { ...cat, items: cat.items.filter(i => i.id !== itemId) } : cat
            ));
            showToast('已删除', 'info');
        }
    };

    if (loading && !trip) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-zinc-900" /></div>;
    if (!trip && !loading) return (<div className="flex flex-col h-screen items-center justify-center bg-background text-center gap-4"><AlertTriangle size={48} className="text-zinc-300" /><h2 className="text-xl font-bold">无法找到行程</h2><button onClick={() => router.push('/')} className="px-6 py-2 bg-black text-white rounded-full">返回首页</button></div>);

    const currentDay = days[currentDayIdx] || { title: 'Day 1' };
    const pendingTasks = checklistCategories.flatMap(c => c.items.filter(i => !i.done).map(i => ({ ...i, catId: c.id }))).slice(0, 4);

    return (
        <div className="bg-background min-h-screen font-sans text-foreground pb-24 selection:bg-primary/20 selection:text-primary">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            {showModal && <ActivityModal initialData={editingActivity} onClose={() => setShowModal(false)} onSubmit={handleSaveActivity} showToast={showToast} />}
            {showShareModal && <ShareModal trip={trip} isOwner={!!isOwner} onClose={() => setShowShareModal(false)} onUpdate={(newTrip: any) => setTrip(newTrip)} showToast={showToast} />}

            {showExportModal && (
                <ExportModal
                    trip={trip}
                    day={currentDay}
                    activities={activities}
                    onClose={() => setShowExportModal(false)}
                    showToast={showToast}
                />
            )}

            {showBudgetImport && <ImportBudgetModal onClose={() => setShowBudgetImport(false)} />}

            {/* 🌟 全屏地图弹窗 */}
            {showFullMap && (
                <div className="fixed inset-0 z-[150] bg-primary flex flex-col animate-in fade-in">
                    <div className="absolute top-4 right-4 z-[160]">
                        <button onClick={() => setShowFullMap(false)} className="bg-white text-zinc-900 p-2 rounded-full shadow-lg hover:bg-zinc-100 transition-colors"><X size={24} /></button>
                    </div>
                    <div className="flex-1 w-full h-full">
                        <Map markers={activities.map((a, i) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, index: i }))} className="w-full h-full" />
                    </div>
                </div>
            )}

            {confirmState.isOpen && <ConfirmModal {...confirmState} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />}

            <nav className="fixed top-0 inset-x-0 z-40 h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                                <Plane size={14} />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">TripSync</span>
                        </div>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all", activeTab === tab.id ? "bg-white dark:bg-zinc-800 text-primary shadow-sm border border-zinc-200 dark:border-zinc-700" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent")}>
                                <tab.icon size={14} /> <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowShareModal(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/50 rounded-md transition-all">
                            <Share2 size={13} /> 协作
                        </button>

                        {activeTab === 'timeline' && canEdit && (
                            <button onClick={() => setIsEditing(!isEditing)} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-all border", isEditing ? "text-primary-foreground bg-primary border-primary" : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800")}>
                                {isEditing ? <Eye size={13} /> : <PenLine size={13} />}
                                <span>{isEditing ? '预览' : '编辑'}</span>
                            </button>
                        )}

                        {activeTab === 'timeline' && !isEditing && (
                            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:text-white dark:hover:text-zinc-900 rounded-md shadow-sm transition-all">
                                <Download size={13} /> 生成攻略图
                            </button>
                        )}

                        <UserMenu user={currentUser} onLogout={handleLogout} onOpenSettings={() => { }} />
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 pt-24">

                {activeTab === 'timeline' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 animate-in fade-in duration-500">
                        <div className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-sm border border-zinc-200 h-48 sm:h-64 bg-zinc-100">
                            <img src={trip?.cover_image || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" alt="Cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/80 backdrop-blur-md text-[11px] font-semibold text-white shadow-sm border border-white/10">
                                        <CalendarDays size={12} /> {trip?.start_date ? new Date(trip.start_date).toLocaleDateString() : '未定日期'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[11px] font-medium text-white">
                                        <MapPin size={12} /> 日本, 京都
                                    </span>
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-md">{trip?.title}</h1>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-zinc-900 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-6 flex flex-col justify-between h-48 sm:h-64 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full blur-3xl opacity-60 -mr-10 -mt-10 pointer-events-none"></div>
                            <div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xs font-semibold text-indigo-900/60 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                                        <span className="flex items-center gap-1.5"><PieChart size={14} /> 总预算</span>
                                        <button onClick={() => setShowBudgetImport(true)} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                            导入账单
                                        </button>
                                    </h2>
                                </div>
                                <div className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-baseline gap-1">
                                    <span className="text-lg text-zinc-400 font-medium">¥</span>{budgetLimit.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                        <TrendingDown size={10} /> 预算内
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">剩余 ¥{(budgetLimit - totalCost).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between text-[10px] font-semibold text-zinc-500">
                                    <span>已用 {budgetPercent}%</span>
                                    <span className="text-primary cursor-pointer hover:underline">详情</span>
                                </div>
                                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-zinc-100">
                                    <div className={cn("h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-1000", budgetPercent > 100 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500")} style={{ width: `${Math.min(100, budgetPercent)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content */}
                {activeTab === 'timeline' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-7 xl:col-span-8">
                            <div className="sticky top-16 z-30 bg-[#FAFAFA]/95 dark:bg-zinc-950/95 backdrop-blur-sm py-4 mb-4 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{currentDay.title}</h2>
                                    <span className="text-sm font-medium text-zinc-500">10月12日 · 抵达与初见</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentDayIdx(c => Math.max(0, c - 1))} disabled={currentDayIdx === 0} className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-primary shadow-sm disabled:opacity-30 transition-all text-zinc-600 dark:text-zinc-300"><ChevronLeft size={16} /></button>
                                    <button onClick={() => setCurrentDayIdx(c => Math.min(days.length - 1, c + 1))} disabled={currentDayIdx === days.length - 1} className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-primary shadow-sm disabled:opacity-30 transition-all text-zinc-600 dark:text-zinc-300"><ChevronRight size={16} /></button>
                                </div>
                            </div>

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                                    <div className="relative pl-4 space-y-0 pb-20">
                                        <div className="absolute left-[27px] top-4 bottom-0 w-0.5 bg-zinc-200"></div>

                                        {activities.map((item) => {
                                            const theme = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                                            const hasCover = item.images && item.images.length > 0;

                                            return (
                                                <div key={item.id} className="relative pl-12 pb-8 group/item">
                                                    <SortableItem id={item.id} disabled={!canEdit || !isEditing}>
                                                        <div className="absolute left-[-18px] top-1.5 px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-bold text-zinc-500 dark:text-zinc-400 shadow-sm z-20">
                                                            {item.time}
                                                        </div>
                                                        <div className={cn("absolute left-[15px] top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-sm", theme.bg, theme.ring)}>
                                                            <theme.icon size={12} className={cn(theme.color.replace('text-', 'text-'))} strokeWidth={2.5} />
                                                        </div>
                                                        {isEditing && (
                                                            <div className="absolute -left-6 top-6 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 p-2 z-30">
                                                                <GripVertical size={16} />
                                                            </div>
                                                        )}
                                                        <div
                                                            onClick={() => isEditing && handleOpenEdit(item)}
                                                            className={cn(
                                                                "relative rounded-xl transition-all duration-300 overflow-hidden group/card bg-white dark:bg-zinc-900",
                                                                isEditing
                                                                    ? "border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 pl-4 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                                                                    : "border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 p-5 cursor-default"
                                                            )}>
                                                            {!isEditing && (
                                                                <div className={cn("absolute top-0 left-0 bottom-0 w-1 opacity-0 group-hover/card:opacity-100 transition-opacity rounded-l-xl", theme.barColor)}></div>
                                                            )}
                                                            {isEditing && (
                                                                <div className="absolute top-3 right-3 flex gap-2 z-20">
                                                                    <button onClick={(e) => handleDeleteRequest(e, item.id)} className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-50 border border-zinc-200 shadow-sm"><Trash2 size={14} /></button>
                                                                </div>
                                                            )}
                                                            <div className={cn("flex flex-col gap-3")}>
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h3 className={cn("font-bold text-zinc-900 dark:text-zinc-100", isEditing ? "text-sm" : "text-sm sm:text-base")}>{item.title}</h3>
                                                                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", theme.badgeBg, theme.badgeText, theme.border)}>
                                                                                {theme.label}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                                                            <MapPin size={10} /> {item.location}
                                                                        </p>
                                                                    </div>
                                                                    {!isEditing && item.cost && item.cost > 0 && (
                                                                        <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-background border border-zinc-100 text-zinc-500">
                                                                            ¥{item.cost.toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {!isEditing && hasCover && (
                                                                    <div className="mt-1 w-full h-32 sm:h-40 rounded-lg overflow-hidden relative group/img">
                                                                        <img src={item.images[0]} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" alt="Activity" />
                                                                        <div className="absolute inset-0 bg-black/10 group-hover/img:bg-transparent transition-colors"></div>
                                                                    </div>
                                                                )}
                                                                {item.memo && (
                                                                    <div className={cn("text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed flex gap-2", !isEditing && "bg-background p-2.5 rounded-lg border border-zinc-100/80 dark:border-zinc-800")}>
                                                                        {!isEditing && <Info size={14} className={cn("mt-0.5 flex-shrink-0", theme.color)} />}
                                                                        <span className={isEditing ? "line-clamp-1 text-zinc-400 italic" : ""}>{item.memo}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </SortableItem>
                                                </div>
                                            )
                                        })}

                                        {isEditing && (
                                            <div className="relative pl-12 pt-2 animate-in fade-in">
                                                <div className="absolute left-[15px] top-5 w-6 h-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center z-10 text-zinc-300">
                                                    <Plus size={12} />
                                                </div>
                                                <button onClick={() => { setEditingActivity(null); setShowModal(true); }} className="w-full h-12 rounded-xl border border-dashed border-zinc-300 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-500 hover:text-primary hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                                                    <span className="w-5 h-5 rounded-full bg-zinc-100 group-hover:bg-indigo-100 text-zinc-400 group-hover:text-primary flex items-center justify-center transition-colors">
                                                        <Plus size={12} />
                                                    </span>
                                                    添加活动
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* Right: Sticky Sidebar */}
                        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
                            <div className="sticky top-24 space-y-6">
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-sm h-[340px] relative group hover:shadow-md transition-shadow">
                                    <div className="w-full h-full bg-zinc-100 rounded-xl overflow-hidden relative">
                                        <Map markers={activities.map((a, i) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, index: i }))} className="w-full h-full opacity-90" />
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <button onClick={() => setShowFullMap(true)} className="w-full py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur shadow-sm border border-white/50 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-primary hover:bg-white dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                                            <Maximize2 size={12} /> 打开详细地图
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                                            <span className="p-1 bg-indigo-100 rounded text-primary"><CheckSquare size={12} /></span>
                                            行前清单
                                        </h3>
                                        <button onClick={() => setActiveTab('checklist')} className="text-[10px] text-primary font-medium hover:underline">查看全部</button>
                                    </div>
                                    <div className="space-y-3">
                                        {pendingTasks.length > 0 ? (
                                            pendingTasks.map((item) => (
                                                <div key={`${item.catId}-${item.id}`} onClick={() => toggleChecklistItem(item.catId, item.id)} className="flex items-start gap-2.5 group cursor-pointer">
                                                    <div className="w-4 h-4 mt-0.5 rounded border border-zinc-300 bg-white group-hover:border-indigo-500 flex items-center justify-center transition-colors"></div>
                                                    <span className="text-xs text-zinc-600 group-hover:text-zinc-900 transition-colors leading-relaxed">{item.text}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-xs text-zinc-400">
                                                <p>🎉 所有准备工作已就绪！</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setActiveTab('checklist')} className="mt-4 w-full py-2 text-[10px] font-medium text-zinc-400 hover:text-primary border-t border-zinc-200/50 transition-colors flex items-center justify-center gap-1">
                                        <Plus size={10} /> 管理清单
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'memories' && <MemoriesTab tripId={Number(tripId)} showToast={showToast} />}
                {activeTab === 'checklist' && <ChecklistTab categories={checklistCategories} onToggle={toggleChecklistItem} onAdd={addChecklistItem} onDelete={deleteChecklistItem} />}

            </main>
        </div>
    );

    function handleOpenEdit(activity: Activity) {
        if (!canEdit) return;
        setEditingActivity(activity);
        setShowModal(true);
    }
}

function MemoriesTab({ tripId, showToast }: { tripId: number, showToast: any }) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Publishing state
    const [newPost, setNewPost] = useState('');
    const [newPostImages, setNewPostImages] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Commenting state (post_id -> string)
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    // Expanded comments state (post_id -> boolean)
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
        fetchPosts();

        // Realtime subscription
        const channel = supabase.channel('memories-tab')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `trip_id=eq.${tripId}` }, fetchPosts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchPosts) // Naive refresh for simplicity
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchPosts)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tripId]);

    const fetchPosts = async () => {
        // Note: In a real app, you'd want efficient pagination and selective updates.
        // Here we reload the feed for simplicity on updates.
        const { data, error } = await supabase
            .from('memories')
            .select(`
                *,
                profiles (full_name, avatar_url),
                comments (
                    id, content, created_at, user_id,
                    profiles (full_name, avatar_url)
                ),
                likes (user_id)
            `)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching memories:', error);

        if (data) {
            // Transform data to easy-to-use structure
            const formatted = data.map((item: any) => ({
                id: item.id,
                user: item.profiles?.full_name || '未知用户',
                avatar: item.profiles?.avatar_url || item.profiles?.full_name?.[0] || '?',
                user_id: item.user_id,
                time: new Date(item.created_at).toLocaleString(),
                content: item.content,
                images: item.images || [],
                likes_count: item.likes?.length || 0,
                liked: item.likes?.some((l: any) => l.user_id === currentUser?.id), // Need to update this after currentUser is set
                comments: item.comments?.map((c: any) => ({
                    id: c.id,
                    user: c.profiles?.full_name || '未知用户',
                    avatar: c.profiles?.avatar_url || c.profiles?.full_name?.[0] || '?',
                    content: c.content,
                    time: new Date(c.created_at).toLocaleString()
                })).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()) || []
            }));
            setPosts(formatted);
        }
        setLoading(false);
    };

    // Re-calculate 'liked' status when currentUser changes
    useEffect(() => {
        if (!currentUser) return;
        setPosts(prev => prev.map(p => ({
            ...p,
            // Note: We can't easily re-check 'liked' without original data, 
            // but fetchPosts is fast enough or we wait for next fetch.
            // Actually, let's just trigger fetchPosts once user is loaded.
        })));
        fetchPosts();
    }, [currentUser?.id]);


    const handlePublish = async () => {
        if ((!newPost.trim() && newPostImages.length === 0) || !currentUser) return;
        setIsPublishing(true);
        try {
            // Upload images first (Mocking upload here or implement real storage upload if bucket ready)
            // Assuming images are base64 strings from FileReader for now, 
            // In production, you MUST upload to Supabase Storage and use URLs.
            // For now, we'll assume base64 is okay for small demo or assume handleFileUpload handles it.
            // To be robust:
            // const uploadedUrls = await Promise.all(newPostImages.map(base64 => uploadToStorage(base64)));

            // For now, let's use the base64/blob urls directly (Limits size, but works for demo)
            // BETTER: Use the existing logic or just save.

            const { error } = await supabase.from('memories').insert({
                trip_id: tripId,
                user_id: currentUser.id,
                content: newPost,
                images: newPostImages // Ensure column type is text[]
            });

            if (error) throw error;

            setNewPost('');
            setNewPostImages([]);
            showToast('发布成功！', 'success');
        } catch (e: any) {
            console.error(e);
            showToast('发布失败: ' + e.message, 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    const toggleLike = async (post: any) => {
        if (!currentUser) return;
        if (post.liked) {
            // Unlike
            await supabase.from('likes').delete().match({ memory_id: post.id, user_id: currentUser.id });
        } else {
            // Like
            await supabase.from('likes').insert({ memory_id: post.id, user_id: currentUser.id });
        }
        // Optimistic UI update could be done here, but realtime will handle it.
    };

    const handlePostComment = async (postId: string) => {
        const content = commentInputs[postId];
        if (!content?.trim() || !currentUser) return;

        const { error } = await supabase.from('comments').insert({
            memory_id: postId,
            user_id: currentUser.id,
            content: content
        });

        if (error) {
            showToast('评论失败', 'error');
        } else {
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
            // Auto expand comments
            setExpandedComments(prev => ({ ...prev, [postId]: true }));
        }
    };

    const handleSaveImage = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'trip-memory.jpg';
        link.target = '_blank';
        link.click();
    };

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Publisher */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 mb-8">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                        {currentUser?.user_metadata?.full_name?.[0] || 'Me'}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            placeholder="分享旅途中的精彩瞬间..."
                            className="w-full bg-transparent border-none outline-none focus:ring-0 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm h-20 p-2 rounded-xl focus:bg-zinc-50 dark:focus:bg-zinc-800/50 transition-colors"
                        />
                        {newPostImages.length > 0 && (
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                                {newPostImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group border border-zinc-200 dark:border-zinc-700">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => setNewPostImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                            <button onClick={() => fileInputRef.current?.click()} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                                <ImageIcon size={20} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files) {
                                        // TODO: Implement Real Storage Upload. Using Base64 for MVP.
                                        const files = Array.from(e.target.files);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setNewPostImages(prev => [...prev, reader.result as string]);
                                            reader.readAsDataURL(file);
                                        });
                                    }
                                }}
                            />
                            <button onClick={handlePublish} disabled={isPublishing || (!newPost.trim() && newPostImages.length === 0)} className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
                                {isPublishing && <Loader2 size={14} className="animate-spin" />} 发布
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feed */}
            {loading ? (
                <div className="text-center py-10 text-zinc-400 text-sm flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" /> 加载回忆中...
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-sm">
                    还没有动态，快来发布第一条回忆吧！
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map(post => {
                        const isExpanded = expandedComments[post.id];
                        const hasComments = post.comments.length > 0;

                        return (
                            <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-sm border-2 border-white dark:border-zinc-800 shadow-sm overflow-hidden">
                                        {post.avatar?.length > 2 ? <img src={post.avatar} className="w-full h-full object-cover" /> : post.avatar}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{post.user}</h4>
                                        <p className="text-[10px] text-zinc-400">{post.time}</p>
                                    </div>
                                    {currentUser?.id === post.user_id && (
                                        <button onClick={async () => {
                                            if (confirm('确定删除这条动态吗？')) {
                                                await supabase.from('memories').delete().eq('id', post.id);
                                                showToast('已删除', 'success');
                                            }
                                        }} className="ml-auto text-zinc-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                    )}
                                </div>

                                <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                                {post.images.length > 0 && (
                                    <div className={cn("grid gap-2 mb-4 rounded-xl overflow-hidden", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                                        {post.images.map((img: string, i: number) => (
                                            <div key={i} className="relative group cursor-zoom-in">
                                                <img src={img} className="w-full h-48 object-cover bg-zinc-100 dark:bg-zinc-800" />
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveImage(img); }} className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-6 border-t border-zinc-50 dark:border-zinc-800 pt-3">
                                    <button onClick={() => toggleLike(post)} className={cn("flex items-center gap-1.5 text-xs font-bold transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800", post.liked ? "text-rose-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
                                        <Heart size={16} fill={post.liked ? "currentColor" : "none"} /> {post.likes_count || '赞'}
                                    </button>
                                    <button onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className={cn("flex items-center gap-1.5 text-xs font-bold transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800", (isExpanded || hasComments) ? "text-indigo-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
                                        <MessageCircle size={16} /> {post.comments.length > 0 ? post.comments.length : '评论'}
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {(isExpanded || hasComments) && (
                                    <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 animate-in fade-in">
                                        {/* Existing Comments */}
                                        {post.comments.length > 0 && (
                                            <div className="space-y-3 mb-4">
                                                {post.comments.map((comment: any) => (
                                                    <div key={comment.id} className="flex gap-3 text-sm group">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 flex-shrink-0 overflow-hidden">
                                                            {comment.avatar?.length > 2 ? <img src={comment.avatar} className="w-full h-full object-cover" /> : comment.avatar}
                                                        </div>
                                                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-2xl rounded-tl-none">
                                                            <div className="flex justify-between items-baseline mb-0.5">
                                                                <span className="font-bold text-xs text-zinc-700 dark:text-zinc-300">{comment.user}</span>
                                                                <span className="text-[9px] text-zinc-400">{comment.time}</span>
                                                            </div>
                                                            <p className="text-zinc-600 dark:text-zinc-400 text-xs">{comment.content}</p>
                                                        </div>
                                                        {currentUser?.id === post.user_id && (
                                                            <button
                                                                onClick={async () => await supabase.from('comments').delete().eq('id', comment.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 self-center"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Comment Input */}
                                        <div className="flex gap-2 items-center">
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-500 flex-shrink-0">
                                                {currentUser?.user_metadata?.full_name?.[0] || 'Me'}
                                            </div>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                    onKeyDown={e => e.key === 'Enter' && handlePostComment(post.id)}
                                                    placeholder="写下你的评论..."
                                                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-full px-4 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500/50"
                                                />
                                                <button
                                                    onClick={() => handlePostComment(post.id)}
                                                    disabled={!commentInputs[post.id]?.trim()}
                                                    className="absolute right-1 top-1 p-0.5 bg-indigo-500 text-white rounded-full disabled:opacity-0 transition-all hover:bg-indigo-600"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function ChecklistTab({ categories, onToggle, onAdd, onDelete }: {
    categories: ChecklistCategory[],
    onToggle: (cid: string, iid: number) => void,
    onAdd: (cid: string) => void,
    onDelete: (cid: string, iid: number) => void
}) {
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const doneItems = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.done).length, 0);
    const progress = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="bg-primary text-primary-foreground rounded-3xl p-6 mb-8 shadow-lg shadow-zinc-900/20">
                <div className="flex justify-between items-end mb-4">
                    <div><h2 className="text-2xl font-bold">准备进度</h2><p className="text-zinc-400 text-xs mt-1">别忘了检查护照和签证哦！</p></div>
                    <div className="text-3xl font-bold">{progress}%</div>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                {cat.id === 'docs' && <Briefcase size={16} className="text-blue-500" />}
                                {cat.id === 'clothes' && <Shirt size={16} className="text-rose-500" />}
                                {cat.id === 'elec' && <Camera size={16} className="text-amber-500" />}
                                {cat.id === 'todo' && <ListTodo size={16} className="text-purple-500" />}
                                {cat.title}
                            </h3>
                            <button onClick={() => onAdd(cat.id)} className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-primary transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="space-y-2 flex-1">
                            {cat.items.length === 0 && <p className="text-xs text-zinc-300 text-center py-4">暂无项目</p>}
                            {cat.items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-background rounded-xl group transition-colors">
                                    <div onClick={() => onToggle(cat.id, item.id)} className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0", item.done ? "bg-primary border-zinc-900" : "border-zinc-200 bg-white group-hover:border-zinc-300")}>
                                        {item.done && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <span onClick={() => onToggle(cat.id, item.id)} className={cn("text-sm font-medium transition-colors cursor-pointer flex-1", item.done ? "text-zinc-400 line-through" : "text-zinc-700")}>{item.text}</span>

                                    {/* 🌟 删除按钮：悬停显示 */}
                                    <button onClick={() => onDelete(cat.id, item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 p-1 transition-all">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {/* 占位符 */}
                <button className="border-2 border-dashed border-zinc-200 rounded-3xl p-5 flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-background transition-all gap-2 min-h-[160px] opacity-50 cursor-not-allowed">
                    <Plus size={24} />
                    <span className="text-xs font-bold">添加自定义分类 (开发中)</span>
                </button>
            </div>
        </div>
    )
}

function ShareModal({ trip, isOwner, onClose, onUpdate, showToast }: any) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('链接已复制', 'success'); };
    const handleInvite = async () => { showToast('邀请已发送', 'success'); setInviteEmail(''); };
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 border border-white/50">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-zinc-900">分享行程</h3><button onClick={onClose}><X size={20} /></button></div>
                <div className="bg-background p-4 rounded-2xl flex items-center gap-3 mb-6"><div className="flex-1 truncate text-xs text-zinc-500 font-mono">{window.location.href}</div><button onClick={handleCopy} className="text-xs font-bold bg-white border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-background">{copied ? '已复制' : '复制链接'}</button></div>
                <div className="space-y-4"><h4 className="text-xs font-bold text-zinc-500 uppercase">邀请协作者</h4><div className="flex gap-2"><input type="email" placeholder="输入邮箱地址" className="flex-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /><button onClick={handleInvite} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-800">邀请</button></div></div>
            </div>
        </div>
    )
}

function ActivityModal({ initialData, onClose, onSubmit, showToast }: any) {
    const [formData, setFormData] = useState(initialData || { type: 'spot', title: '', time: '10:00', location: '', lat: 34.99, lng: 135.75, cost: 0, memo: '' });
    const handleSubmit = () => { if (!formData.title) return showToast('请输入标题', 'error'); onSubmit(formData); }
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-zinc-900">{initialData ? '编辑活动' : '添加新活动'}</h3><button onClick={onClose}><X size={20} className="text-zinc-500 hover:text-zinc-900" /></button></div>
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                            const isSelected = formData.type === key;
                            // Dynamic active styles based on type config
                            const activeStyle = isSelected
                                ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ${cfg.ring}`
                                : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900";

                            return (
                                <button
                                    key={key}
                                    onClick={() => setFormData({ ...formData, type: key })}
                                    className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border transition-all", activeStyle)}
                                >
                                    <cfg.icon size={16} />
                                    <span className="text-[10px] font-medium">{cfg.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-xs font-bold text-zinc-500 mb-1 block">时间</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full p-3 bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-zinc-500 mb-1 block">活动名称</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="例如：春熙路"
                                className="w-full p-3 bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    {/* 🌟 替换为国内优化搜索组件 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">地点搜索</label>
                        <LocationSearch
                            value={formData.location}
                            onChange={(val) => setFormData({ ...formData, location: val })}
                            onSelect={(loc) => setFormData({ ...formData, location: loc.address.split(',')[0], lat: loc.lat, lng: loc.lng })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-1 block">预算 (CNY)</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                                className="w-full p-3 bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
                            />
                        </div>
                        {/* Other inputs if any */}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">备注</label>
                        <textarea
                            value={formData.memo || ''}
                            onChange={e => setFormData({ ...formData, memo: e.target.value })}
                            placeholder="添加备注信息..."
                            className="w-full p-3 bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm h-24 resize-none placeholder:text-zinc-400"
                        />
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                    <button onClick={handleSubmit} className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl shadow-lg shadow-zinc-900/20 transition-all active:scale-95">
                        保存
                    </button>
                </div>
            </div>
        </div>
    )
}

function ConfirmModal(props: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={props.onCancel} />
            <div className="relative bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full animate-in zoom-in-95">
                <h3 className="font-bold text-lg mb-2">{props.title}</h3>
                <p className="text-zinc-500 text-sm mb-6">{props.desc}</p>
                <div className="flex gap-3"><button onClick={props.onCancel} className="flex-1 py-2.5 font-bold text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200">取消</button><button onClick={props.onConfirm} className="flex-1 py-2.5 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-200">确认</button></div>
            </div>
        </div>
    )
}