'use client'

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SortableItem } from "@/components/SortableItem";
import { 
  ArrowLeft, Plane, Map as MapIcon, Image as ImageIcon, CheckCircle2, 
  Share2, PenLine, Settings2, PieChart, TrendingDown,
  ChevronLeft, ChevronRight, GripVertical, Plus, CalendarDays, MapPin,
  TrainFront, BedDouble, Utensils, Camera, Info, 
  UploadCloud, X, Clock, AlignLeft, Loader2, Trash2, Check, AlertTriangle, 
  Globe, Copy, Lock, UserPlus, Users
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from "@/lib/utils";

// --- 动态加载组件 ---
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">地图加载中...</div>
});

// --- 类型定义 ---
interface Trip {
  id: number;
  title: string;
  cover_image: string | null;
  start_date: string;
  budget_limit?: number;
  budget?: number;
  user_id?: string;     // 作者ID
  is_public?: boolean;  // 公开状态
}
interface Day { id: number; day_index: number; title: string; date?: string; }
interface Activity { 
  id: number; title: string; location: string; time: string; lat: number; lng: number; sort_order: number;
  type: string; is_tentative: boolean; images: string[]; memo?: string; cost?: number;
}
interface SearchResult { name: string; address: string; lat: number; lng: number; }
interface TripMember { id: number; email: string; } // ✨ 新增：成员结构

// --- UI 配置 ---
const TYPE_CONFIG: Record<string, { color: string, bg: string, border: string, icon: any, label: string }> = {
  flight: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Plane, label: '航班' },
  transport: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: TrainFront, label: '交通' },
  rest: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: BedDouble, label: '住宿' },
  food: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Utensils, label: '餐饮' },
  spot: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Camera, label: '景点' },
  other: { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: MapPin, label: '其他' },
};

const TABS = [
  { id: 'timeline', label: '行程规划', icon: MapIcon },
  { id: 'photos', label: '灵感 & 回忆', icon: ImageIcon },
  { id: 'checklist', label: '行前清单', icon: CheckCircle2 }
];

export default function PlanDetail() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data State
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false); // ✨ 判断是否是协作者
  
  // UI State
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false); 
  const [activeTab, setActiveTab] = useState('timeline');
  
  const [showModal, setShowModal] = useState(false); 
  const [showShareModal, setShowShareModal] = useState(false); // ✨ 分享弹窗
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null); 
  
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, desc: string, isDestructive: boolean, onConfirm: () => void }>({
      isOpen: false, title: '', desc: '', isDestructive: false, onConfirm: () => {}
  });

  const totalCost = activities.reduce((sum, item) => sum + (item.cost || 0), 0);
  const budgetLimit = trip?.budget_limit || 50000;
  const budgetPercent = Math.min(100, Math.round((totalCost / budgetLimit) * 100));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- 初始化数据 ---
  const initData = useCallback(async () => {
    setLoading(true);
    
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. 获取 Trip
    const { data: tripData, error } = await supabase.from('trips').select('*').eq('id', tripId).single();
    
    if (error) {
        alert("无法加载行程，可能是链接错误或权限不足。");
        router.push('/'); 
        return;
    }
    setTrip(tripData);

    // 3. ✨ 检查协作者身份
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
  }, [tripId, router]);

  const fetchActivities = useCallback(async () => {
    if(!days[currentDayIdx]) return;
    const { data } = await supabase.from('activities').select('*').eq('day_id', days[currentDayIdx].id).order('sort_order', { ascending: true });
    if(data) setActivities(data as Activity[]);
  }, [days, currentDayIdx]);

  useEffect(() => { initData(); }, [initData]);
  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // ✨ 核心权限控制：Owner 或 Member 均可编辑
  const isOwner = currentUser && trip && currentUser.id === trip.user_id;
  const canEdit = isOwner || isMember;

  // --- 逻辑处理 ---
  const handleOpenCreate = () => { setEditingActivity(null); setShowModal(true); };
  const handleOpenEdit = (activity: Activity) => { 
      if(!canEdit) return; 
      setEditingActivity(activity); 
      setShowModal(true); 
  };

  const handleSaveActivity = async (data: any) => {
    setShowModal(false);
    const finalLat = data.lat || 34.99; 
    const finalLng = data.lng || 135.75;
    if (editingActivity) {
        setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...data, lat: finalLat, lng: finalLng } : a));
        await supabase.from('activities').update({ ...data, lat: finalLat, lng: finalLng }).eq('id', editingActivity.id);
    } else {
        const newTempActivity = { id: Date.now(), day_id: days[currentDayIdx].id, sort_order: activities.length, is_tentative: false, images: [], ...data, lat: finalLat, lng: finalLng };
        setActivities(prev => [...prev, newTempActivity]);
        await supabase.from('activities').insert([{ day_id: days[currentDayIdx].id, sort_order: activities.length, is_tentative: false, ...data, lat: finalLat, lng: finalLng }]);
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
          }
      });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if(!canEdit) return;
    const { active, over } = event;
    if (active.id !== over?.id) {
        setActivities((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over?.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
            updates.forEach(up => supabase.from('activities').update({ sort_order: up.sort_order }).eq('id', up.id));
            return newItems;
        });
    }
  };

  if (loading && !trip) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-500"/></div>;

  const currentDay = days[currentDayIdx] || { title: 'Day 1' };
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {showModal && <ActivityModal initialData={editingActivity} onClose={() => setShowModal(false)} onSubmit={handleSaveActivity} />}
      
      {/* ✨ ShareModal: 传入 isOwner 状态 */}
      {showShareModal && trip && <ShareModal trip={trip} isOwner={!!isOwner} onClose={() => setShowShareModal(false)} onUpdate={(newTrip) => setTrip(newTrip)} />}
      
      {confirmState.isOpen && <ConfirmModal {...confirmState} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />}

      {/* FAB: 有权限编辑时才显示 */}
      {activeTab === 'timeline' && canEdit && (
        <div className="fixed bottom-8 right-6 z-50 animate-in zoom-in duration-300">
            <button onClick={handleOpenCreate} className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-300 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20" title="添加新活动">
                <Plus size={28} strokeWidth={2.5} />
            </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-40 h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-md flex items-center justify-center shadow-sm group-hover:rotate-3 transition-transform"><Plane size={14} strokeWidth={2.5} /></div>
                    <span className="font-semibold text-sm tracking-tight text-slate-900">TripSync</span>
                </div>
            </div>
            <div className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-lg border border-slate-200/50">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-3 py-1 rounded-[6px] text-xs font-medium transition-all", activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900 border border-transparent")}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
                {/* 分享按钮 */}
                <button onClick={() => setShowShareModal(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-md transition-all">
                    <Share2 size={13} /> {isOwner ? '分享与协作' : '行程信息'}
                </button>
                
                {/* 整理按钮 (仅编辑者可见) */}
                {canEdit && (
                    <button onClick={() => setIsEditing(!isEditing)} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-all border", isEditing ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
                        {isEditing ? <Check size={13} /> : <PenLine size={13} />}
                        <span>{isEditing ? '完成整理' : '整理行程'}</span>
                    </button>
                )}
            </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-20">
        
        {/* Header */}
        <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'map' ? 'hidden' : 'block')}>
             <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                <div className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-sm border border-slate-200 h-48 lg:h-64">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none"></div>
                    <img src={trip?.cover_image || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2070&q=80"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Trip Cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/80 backdrop-blur-md text-[11px] font-semibold text-white shadow-sm border border-white/10">
                                <CalendarDays size={12} /> {trip?.start_date ? new Date(trip.start_date).toLocaleDateString() : '未定日期'}
                            </span>
                            {trip?.is_public && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md border border-white/20 text-[11px] font-medium text-white shadow-sm">
                                    <Globe size={12} /> 公开分享中
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight drop-shadow-md">{trip?.title}</h1>
                    </div>
                </div>
                <div className="lg:col-span-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 rounded-2xl p-6 flex flex-col justify-between h-48 lg:h-64 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider flex items-center gap-1.5"><PieChart size={14} /> 总预算</h2>
                            {canEdit && <button className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"><Settings2 size={14} /></button>}
                        </div>
                        <div className="text-4xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1"><span className="text-lg text-slate-400 font-medium">¥</span>{budgetLimit.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-3">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border", budgetPercent > 100 ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200")}>
                                <TrendingDown size={10} /> {budgetPercent > 100 ? "超支" : "预算内"}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">剩余 ¥{(budgetLimit - totalCost).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </header>
        </div>

        {/* Timeline View */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-10", activeTab === 'timeline' ? '' : 'hidden')}>
            <div className="lg:col-span-7 xl:col-span-8">
                {/* Day Switcher */}
                <div className="sticky top-14 z-30 bg-slate-50/95 backdrop-blur-sm py-4 border-b border-slate-200 mb-8 -mx-4 px-4 lg:mx-0 lg:px-0 transition-all flex items-center justify-between">
                     <div className="flex items-baseline gap-3">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentDay.title}</h2>
                        <span className="text-sm font-medium text-slate-500">Day {currentDayIdx + 1}/{days.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentDayIdx(curr => Math.max(0, curr - 1))} disabled={currentDayIdx===0} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm text-slate-400 disabled:opacity-50 transition-all"><ChevronLeft size={16}/></button>
                        <button onClick={() => setCurrentDayIdx(curr => Math.min(days.length-1, curr + 1))} disabled={currentDayIdx===days.length-1} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm text-slate-400 disabled:opacity-50 transition-all"><ChevronRight size={16}/></button>
                    </div>
                </div>

                <div className="relative pl-4 space-y-0 pb-20">
                    <div className="absolute left-[27px] top-2 bottom-6 w-0.5 bg-slate-200"></div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        {activities.map((item, index) => {
                            const theme = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                            const ThemeIcon = theme.icon;
                            const coverImg = item.images && item.images.length > 0 ? item.images[0] : null;

                            return (
                                <div key={item.id} className="relative pl-12 pb-10 group/item">
                                    <SortableItem id={item.id} disabled={!canEdit}>
                                        {/* 仅有权限者在整理模式可见手柄 */}
                                        {isEditing && canEdit && <div className="absolute -left-6 top-8 cursor-move text-slate-300 hover:text-indigo-500 p-2 z-20 transition-colors animate-in fade-in"><GripVertical size={16}/></div>}
                                        
                                        <div className="absolute left-[-18px] top-1.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 shadow-sm z-20">{item.time}</div>
                                        <div className={cn("absolute left-[15px] top-0 w-6 h-6 rounded-full border-2 border-white ring-1 flex items-center justify-center z-10 shadow-sm transition-colors", theme.bg, theme.color, `ring-${theme.color.split('-')[1]}-200`)}><ThemeIcon size={12} /></div>

                                        <div 
                                            onClick={() => handleOpenEdit(item)}
                                            className={cn(
                                                "relative rounded-xl border transition-all group/card overflow-hidden", 
                                                canEdit ? "cursor-pointer" : "cursor-default",
                                                (item.is_tentative || isEditing) 
                                                    ? "bg-white border-slate-200 shadow-sm p-5"
                                                    : "bg-white border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 duration-300"
                                            )}
                                        >
                                            {!isEditing && !item.is_tentative && coverImg && (
                                                <div className="h-32 w-full relative">
                                                    <img src={coverImg} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                                    <span className={cn("absolute bottom-2 left-3 px-2 py-0.5 rounded text-[10px] font-bold border bg-white/90 backdrop-blur-sm", theme.color, theme.border)}>
                                                        {theme.label}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={cn(!isEditing && !item.is_tentative && coverImg ? "p-4" : (item.is_tentative || isEditing) ? "" : "p-5")}>
                                                {!coverImg && !isEditing && (
                                                     <div className={cn("absolute top-0 left-0 bottom-0 w-1 opacity-100", theme.bg.replace('bg-', 'bg-').replace('50', '500'))}></div>
                                                )}

                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className={cn("font-bold text-slate-900 truncate", isEditing ? "text-sm" : "text-base")}>{item.title}</h3>
                                                            {(!coverImg || isEditing) && <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0", theme.bg, theme.color, theme.border)}>{theme.label}</span>}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate"><MapPin size={10} /> {item.location}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                         {!isEditing && item.cost && item.cost > 0 && <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">¥{item.cost}</span>}
                                                         {isEditing && canEdit && (
                                                             <button onClick={(e) => handleDeleteRequest(e, item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors animate-in zoom-in" title="删除活动"><Trash2 size={14}/></button>
                                                         )}
                                                    </div>
                                                </div>

                                                {item.memo && <div className={cn("mt-2 text-xs leading-relaxed text-slate-600 flex gap-2", isEditing ? "bg-slate-50 p-2 rounded border border-slate-100" : "")}>
                                                    {isEditing && <Info size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />}
                                                    <span className={isEditing ? "" : "line-clamp-2"}>{item.memo}</span>
                                                </div>}

                                                {(isEditing || !coverImg) && item.images && item.images.length > 0 && (
                                                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">{item.images.map((img, idx) => (<img key={idx} src={img} className="w-16 h-16 rounded-lg object-cover border border-slate-200 hover:scale-105 transition-transform"/>))}</div>
                                                )}
                                            </div>
                                        </div>
                                    </SortableItem>
                                </div>
                            );
                        })}
                    </SortableContext>
                    </DndContext>
                </div>
            </div>
            
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-6">
                 <div className="sticky top-24 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-hidden h-[340px] relative group hover:shadow-md transition-shadow">
                        <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden relative">
                             <Map className="w-full h-full opacity-90 hover:opacity-100 transition-opacity" markers={activities.map((a,i) => ({id:a.id, lat:a.lat, lng:a.lng, title:a.title, index:i}))} />
                            <div className="absolute bottom-4 left-4 right-4"><button onClick={() => setActiveTab('map')} className="w-full py-2 bg-white/90 backdrop-blur shadow-sm border border-white/50 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white transition-colors">查看完整地图</button></div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Full Map View */}
        <div className={cn("w-full bg-zinc-100 overflow-hidden relative animate-in fade-in duration-300", activeTab === 'map' ? 'block h-[calc(100vh-80px)]' : 'hidden')}>
             <Map className="w-full h-full" markers={activities.map((a,i) => ({id:a.id, lat:a.lat, lng:a.lng, title:a.title, index:i}))} />
             <button onClick={() => setActiveTab('timeline')} className="absolute top-4 left-4 z-10 px-4 py-2 bg-white rounded-full shadow-md text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <ChevronLeft size={16}/> 返回行程
             </button>
        </div>

        <div className={cn("py-20 text-center text-slate-400", activeTab === 'checklist' ? 'block' : 'hidden')}><CheckCircle2 size={48} className="mx-auto mb-4 opacity-20"/><p>清单功能即将上线...</p></div>
        <div className={cn("py-20 text-center text-slate-400", activeTab === 'photos' ? 'block' : 'hidden')}><ImageIcon size={48} className="mx-auto mb-4 opacity-20"/><p>相册功能即将上线...</p></div>

      </main>
    </div>
  );
}

// ActivityModal (略，保持不变)
// ... ActivityModal 代码 ...
function ActivityModal({ initialData, onClose, onSubmit }: { initialData?: Activity | null, onClose: () => void, onSubmit: (data: any) => void }) {
    // ... 代码不变，请复制上个版本的 ActivityModal ...
    const isEdit = !!initialData;
    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState(initialData?.type || 'spot');
    const [time, setTime] = useState(initialData?.time || '10:00');
    
    // Search states
    const [location, setLocation] = useState(initialData?.location || '');
    const [searchQuery, setSearchQuery] = useState(initialData?.location || '');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedLat, setSelectedLat] = useState(initialData?.lat || null);
    const [selectedLng, setSelectedLng] = useState(initialData?.lng || null);

    const [memo, setMemo] = useState(initialData?.memo || '');
    const [cost, setCost] = useState(initialData?.cost?.toString() || '');
  
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        setLocation(query);
        if (query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        setIsSearching(true);
        setTimeout(() => {
            const mockResults: SearchResult[] = [
                { name: `${query}`, address: '模拟地址 1', lat: 34.995 + Math.random()*0.01, lng: 135.755 + Math.random()*0.01 },
                { name: `${query}公园`, address: '模拟地址 2', lat: 34.992 + Math.random()*0.01, lng: 135.752 + Math.random()*0.01 },
            ];
            setSearchResults(mockResults);
            setIsSearching(false);
            setShowResults(true);
        }, 500);
    };

    const handleSelectLocation = (result: SearchResult) => {
        setLocation(result.name);
        setSearchQuery(result.name);
        setSelectedLat(result.lat);
        setSelectedLng(result.lng);
        if (!title) setTitle(result.name);
        setShowResults(false);
    };

    const handleSubmit = () => {
        if(!title) return alert("请输入活动名称");
        onSubmit({ 
            title, type, time, location, memo, 
            cost: cost ? parseFloat(cost) : 0,
            lat: selectedLat, lng: selectedLng
        });
    };
  
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-visible border border-white/50 flex flex-col max-h-[90vh]">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-2xl">
            <h2 className="text-xl font-bold text-slate-900">{isEdit ? '编辑活动' : '新建活动'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-6 bg-white overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">活动名称</label>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="例如：伏见稻荷大社" className="w-full text-xl font-bold border-b-2 border-slate-100 bg-transparent py-2 focus:border-indigo-500 focus:outline-none placeholder:text-slate-300 transition-colors text-slate-800" />
            </div>
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">类型</label>
               <div className="flex flex-wrap gap-2">
                {[{ id: 'spot', label: '📸 景点' }, { id: 'food', label: '🍽️ 美食' }, { id: 'rest', label: '🏨 住宿' }, { id: 'transport', label: '🚆 交通' }, { id: 'flight', label: '✈️ 航班' }, { id: 'other', label: '📍 其他' }].map((t) => (
                    <button key={t.id} onClick={() => setType(t.id)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm", type === t.id ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 ring-offset-1" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600")}>{t.label}</button>
                ))}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
               <div className="space-y-1.5 relative z-20">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={12}/> 地点搜索</label>
                 <div className="relative">
                    <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={() => { if(searchResults.length > 0) setShowResults(true) }} placeholder="输入地点关键词..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                    {isSearching && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-indigo-500"/></div>}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto z-30 animate-in fade-in slide-in-from-top-2">
                            {searchResults.map((res, i) => (
                                <div key={i} onClick={() => handleSelectLocation(res)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                                    <div className="text-sm font-bold text-slate-700">{res.name}</div>
                                    <div className="text-xs text-slate-400 truncate">{res.address}</div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12}/> 时间</label>
                     <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">预估费用</label>
                    <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" />
                  </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="absolute left-3 top-3 text-slate-400"><AlignLeft size={16} /></div>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="添加备注..." className="w-full min-h-[80px] pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400" />
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-900 transition-colors rounded-xl">取消</button>
            <button onClick={handleSubmit} className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95">{isEdit ? '保存修改' : '创建活动'}</button>
          </div>
        </div>
      </div>
    );
}

// ✨ Share Modal - 升级版：支持邀请协作者
function ShareModal({ trip, isOwner, onClose, onUpdate }: { trip: Trip, isOwner: boolean, onClose: () => void, onUpdate: (trip: Trip) => void }) {
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [members, setMembers] = useState<TripMember[]>([]);
    const [adding, setAdding] = useState(false);

    // 加载成员列表
    useEffect(() => {
        const fetchMembers = async () => {
            const { data } = await supabase.from('trip_members').select('*').eq('trip_id', trip.id);
            if(data) setMembers(data);
        };
        fetchMembers();
    }, [trip.id]);

    const togglePublic = async () => {
        setLoading(true);
        const newStatus = !trip.is_public;
        const { error } = await supabase.from('trips').update({ is_public: newStatus }).eq('id', trip.id);
        if(!error) onUpdate({ ...trip, is_public: newStatus });
        setLoading(false);
    };

    const handleInvite = async () => {
        if(!inviteEmail.includes('@')) return alert('请输入有效的邮箱');
        setAdding(true);
        // 添加成员到数据库
        const { data, error } = await supabase.from('trip_members').insert([{ trip_id: trip.id, email: inviteEmail }]).select();
        
        if (error) {
            if(error.code === '23505') alert('该用户已在协作列表中'); // Unique constraint error
            else alert('添加失败');
        } else if (data) {
            setMembers(prev => [...prev, data[0]]);
            setInviteEmail('');
        }
        setAdding(false);
    };

    const handleRemoveMember = async (id: number) => {
        if(!confirm('确定要移除该协作者吗？')) return;
        await supabase.from('trip_members').delete().eq('id', id);
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 border border-white/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">分享与协作</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                
                {/* 1. 公开分享链接 (所有人可见) */}
                <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Globe size={16} className="text-indigo-500"/> 公开分享
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">开启后，获得链接的人仅可查看</p>
                        </div>
                        {isOwner && (
                            <button 
                                onClick={togglePublic} 
                                disabled={loading}
                                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", trip.is_public ? "bg-emerald-500" : "bg-slate-300")}
                            >
                                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ml-1", trip.is_public ? "translate-x-5" : "translate-x-0")}/>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 truncate font-mono select-all">
                            {window.location.href}
                        </div>
                        <button onClick={copyLink} className="px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 min-w-[80px] justify-center">
                            {copied ? <Check size={14}/> : <Copy size={14}/>}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* 2. 协作者管理 (仅 Owner 可操作，非 Owner 仅查看) */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Users size={16} className="text-indigo-500"/> 协作者
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">协作者拥有完全编辑权限</p>
                        </div>
                    </div>

                    {isOwner && (
                        <div className="flex gap-2">
                            <input 
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="输入朋友邮箱..." 
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-all"
                            />
                            <button 
                                onClick={handleInvite} 
                                disabled={adding || !inviteEmail}
                                className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                {adding ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}
                            </button>
                        </div>
                    )}

                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {members.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 italic">暂无协作者</div>
                        ) : (
                            members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {member.email[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm text-slate-700">{member.email}</span>
                                    </div>
                                    {isOwner && (
                                        <button 
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

// ConfirmModal (略，保持不变)
// ... ConfirmModal 代码 ...
function ConfirmModal({ isOpen, title, desc, isDestructive, onConfirm, onCancel }: { isOpen: boolean, title: string, desc: string, isDestructive?: boolean, onConfirm: () => void, onCancel: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in" onClick={onCancel}></div>
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border border-white/50">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-1", isDestructive ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-500")}>
                        {isDestructive ? <AlertTriangle size={24} /> : <Info size={24} />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                    <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">取消</button>
                        <button onClick={onConfirm} className={cn("w-full py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all active:scale-95", isDestructive ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200")}>
                            {isDestructive ? '确认删除' : '确认'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}