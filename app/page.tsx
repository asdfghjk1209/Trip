'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus, Calendar, ArrowRight, MoreHorizontal, LayoutGrid, Heart, MapPin,
    CloudSun, LogIn, Users, Loader2, X,
    Sun, Moon, Cloud, CloudFog, CloudDrizzle, Snowflake, CloudRain, CloudLightning
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";
import ConfirmModal from "@/components/ConfirmModal";


// 定义新的数据接口
interface Trip {
    id: number;
    created_at: string;
    title: string;
    start_date: string | null;
    cover_image: string | null;
    is_public: boolean;
    user_id: string; // 创建者 ID

    // 前端辅助字段
    my_role?: 'owner' | 'editor' | 'viewer';
    member_count?: number;
}

export default function Home() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [authChecking, setAuthChecking] = useState(true);
    const router = useRouter();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTripTitle, setNewTripTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // 删除确认弹窗状态
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        trip: Trip | null;
        isOwner: boolean;
    }>({ isOpen: false, trip: null, isOwner: false });


    // 1. 初始化
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setAuthChecking(false);
            if (user) fetchTrips(user.id);
            else setLoading(false);
        };
        init();

        // 监听实时变化 (当成员表变动时刷新)
        const channel = supabase.channel('home_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, () => {
                if (user) fetchTrips(user.id);
            })
            .subscribe();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) fetchTrips(currentUser.id);
            else setTrips([]);
        });

        return () => {
            supabase.removeChannel(channel);
            authListener.subscription.unsubscribe();
        };
    }, []);

    // 🔥 核心逻辑更新：获取我参与的所有行程
    const fetchTrips = async (userId: string) => {
        setLoading(true);
        try {
            // 查询 trip_members 表，同时关联查出 trips 的详情
            const { data, error } = await supabase
                .from('trip_members')
                .select(`
                role,
                trip:trips (
                    *,
                    trip_members (count) 
                )
            `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 格式化数据
            const formattedTrips = (data || []).map((item: any) => ({
                ...item.trip, // 展开 trip 信息
                my_role: item.role, // 记录我的角色
                member_count: item.trip?.trip_members?.[0]?.count || 1
            })).filter((t: any) => t !== null); // 过滤掉可能的空值

            setTrips(formattedTrips);
        } catch (error: any) {
            console.error('Fetch trips error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setNewTripTitle('');
        setShowCreateModal(true);
    };

    // 🔥 核心逻辑更新：创建行程 + 自动设为 Owner
    const confirmCreateTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTripTitle.trim() || !user) return;

        setIsCreating(true);
        const randomCover = `https://images.unsplash.com/photo-${['1476514525535-07fb3b4ae5f1', '1501785888041-af3ef285b470', '1469854523086-cc02fe5d8800', '1493976040374-85c8e12f0c0e'][Math.floor(Math.random() * 4)]}?w=800&auto=format&fit=crop`;

        try {
            // 1. 创建行程
            const { data: newTrip, error: tripError } = await supabase
                .from('trips')
                .insert([{
                    title: newTripTitle,
                    start_date: new Date().toISOString(),
                    cover_image: randomCover,
                    user_id: user.id
                }])
                .select()
                .single();

            if (tripError) throw tripError;

            // 2. 在成员表里添加自己 (Owner)
            const { error: memberError } = await supabase
                .from('trip_members')
                .insert([{
                    trip_id: newTrip.id,
                    user_id: user.id,
                    role: 'owner'
                }]);

            if (memberError) throw memberError;

            setShowCreateModal(false);
            fetchTrips(user.id);

        } catch (error: any) {
            // Replace alert with simple log or could be a toast in future, for now just console error to avoid interrupt
            console.error("创建失败: ", error.message);
            // Optional: Add some UI feedback for error here if needed
        } finally {
            setIsCreating(false);
        }
    };

    // 触发删除确认 (不再直接 confirm)
    const openDeleteModal = (e: React.MouseEvent, trip: Trip) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return;
        setDeleteConfirmation({
            isOpen: true,
            trip,
            isOwner: trip.my_role === 'owner'
        });
    };

    // 真正的执行删除
    const executeDelete = async () => {
        const { trip, isOwner } = deleteConfirmation;
        if (!trip || !user) return;

        // 关闭弹窗
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));

        try {
            if (isOwner) {
                await supabase.from('trips').delete().match({ id: trip.id });
            } else {
                await supabase.from('trip_members').delete().match({ trip_id: trip.id, user_id: user.id });
            }

            // 乐观更新 UI
            setTrips(prev => prev.filter(t => t.id !== trip.id));
            fetchTrips(user.id); // 再次确认同步
        } catch (error) {
            console.error("Delete error:", error);
        }
    };


    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setTrips([]);
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300 pb-20">

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCreateModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-1">开始一段新旅程</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">给你的计划起个好听的名字吧。</p>
                        <form onSubmit={confirmCreateTrip}>
                            <input
                                autoFocus
                                type="text"
                                value={newTripTitle}
                                onChange={(e) => setNewTripTitle(e.target.value)}
                                placeholder="例如：京都赏樱之旅"
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-lg font-medium outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all mb-6"
                            />
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl transition-colors">取消</button>
                                <button
                                    type="submit"
                                    disabled={!newTripTitle.trim() || isCreating}
                                    className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 size={16} className="animate-spin" />}
                                    创建行程
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirmation.isOpen}
                title={deleteConfirmation.isOwner ? "删除行程" : "退出行程"}
                isDanger={true}
                content={
                    deleteConfirmation.isOwner
                        ? "你是此行程的创建者。删除操作将永久销毁此行程，所有参与者都将无法访问。此操作无法撤销。"
                        : "确定要退出这个行程吗？这只会将其从你的列表中移除，不会影响其他成员。"
                }
                confirmText={deleteConfirmation.isOwner ? "确认删除" : "确认退出"}
                onConfirm={executeDelete}
                onCancel={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
            />


            {/* Navbar */}
            <nav className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <a href="#" className="flex items-center gap-2 group">
                            <div className="w-6 h-6 bg-zinc-900 dark:bg-white rounded-md flex items-center justify-center text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/20">
                                <LayoutGrid size={14} />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">TripSync</span>
                        </a>
                        <div className="hidden md:flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-900/50 p-1 rounded-full border border-zinc-200/50 dark:border-zinc-800">
                            <a href="#" className="text-[11px] font-medium bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700 px-3 py-1 rounded-full transition-all">我的行程</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {authChecking ? (
                            <div className="w-7 h-7 rounded-full bg-zinc-100 animate-pulse"></div>
                        ) : user ? (
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                                    {user.email?.split('@')[0]}
                                </div>
                                {/* 使用公共组件，不再传递 onOpenSettings，因为组件内部处理跳转 */}
                                <UserMenu
                                    user={user}
                                    onLogout={handleLogout}
                                    onOpenSettings={() => { }}
                                />
                            </div>
                        ) : (
                            <Link href="/login">
                                <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-full hover:opacity-90 transition-all shadow-sm">
                                    <LogIn size={12} /> 登录
                                </button>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 pt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Sidebar */}
                <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">{user ? user.email?.split('@')[0] : '访客'}</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">个人空间</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-24 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <WeatherWidget />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-2">我的收藏</h3>
                        <a href="#" className="group flex items-center justify-between px-2.5 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-800 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Heart size={15} className="" />
                                <span className="text-sm font-medium">我的行程</span>
                            </div>
                            <span className="text-xs font-medium">{trips.length}</span>
                        </a>
                    </div>
                </aside>

                {/* Trips List */}
                <div className="col-span-1 lg:col-span-9 space-y-6">

                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                        <h1 className="text-xl font-semibold tracking-tight">最近行程</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">排序:</span>
                            <select className="bg-transparent text-xs font-medium border-none focus:ring-0 p-0 cursor-pointer outline-none dark:bg-zinc-950">
                                <option>最新创建</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />)}
                        </div>
                    ) : trips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20">
                            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                <MapPin size={32} />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">
                                {user ? '开启你的第一段旅程' : '请先登录'}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                                {user ? '点击右下角按钮，记录你的探索计划。' : '登录后即可创建和管理您的行程。'}
                            </p>
                            {!user && (
                                <Link href="/login">
                                    <button className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium text-sm hover:opacity-90 transition-all shadow-lg">
                                        去登录
                                    </button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {trips.map((trip) => (
                                <Link href={`/plan/${trip.id}`} key={trip.id} className="block group">
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-300 relative h-full flex flex-col">
                                        {/* 封面图 */}
                                        <div className="relative h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                            <img
                                                src={trip.cover_image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"}
                                                alt={trip.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                                            {/* 🌟 删除按钮 */}
                                            {user && (
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                                    {trip.member_count && trip.member_count > 1 && (
                                                        <span className="bg-black/50 backdrop-blur text-white px-2 py-1 rounded-md text-[10px] flex items-center gap-1">
                                                            <Users size={10} /> {trip.member_count}
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={(e) => openDeleteModal(e, trip)}
                                                        className="bg-white/90 backdrop-blur text-zinc-700 p-1.5 rounded-md hover:bg-white hover:text-red-600 transition-colors shadow-sm"
                                                        title={trip.my_role === 'owner' ? "永久删除" : "退出行程"}
                                                    >
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                                <div className="flex gap-2 mb-2">
                                                    {/* 权限徽章 */}
                                                    {trip.my_role === 'owner' ? (
                                                        <span className="text-[10px] font-medium bg-indigo-500/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">创建者</span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium bg-orange-500/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">协作</span>
                                                    )}
                                                    {trip.is_public && <span className="text-[10px] font-medium bg-emerald-500/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">公开</span>}
                                                </div>
                                                <h3 className="font-semibold tracking-tight text-lg leading-tight mb-1 truncate">{trip.title}</h3>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={12} />
                                                    {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Date TBD'}
                                                </span>
                                            </div>
                                            <button className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-xs font-medium py-2 rounded-lg group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 group-hover:border-zinc-900 dark:group-hover:border-white transition-all flex items-center justify-center gap-2">
                                                查看详情 <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Add Button */}
            {user && (
                <div className="fixed bottom-8 right-8 z-50 animate-in zoom-in duration-300">
                    <button onClick={handleOpenCreate} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all border-2 border-white/20 dark:border-zinc-900/20">
                        <Plus size={28} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Weather Widget Component ---
function WeatherWidget() {
    const [weather, setWeather] = useState<{ temp: number, condition: string, icon: any, city: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Default to Chengdu for demo if no geolocation
        // Ideally use navigator.geolocation
        const fetchWeather = async (lat: number, lng: number, cityName: string) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
                if (!res.ok) throw new Error('Weather fetch failed');
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.warn("Weather API response not JSON:", text);
                    return;
                }

                if (data.current_weather) {
                    const code = data.current_weather.weathercode;
                    const isDay = data.current_weather.is_day === 1;

                    // Simple WMO Code Mapping
                    let condition = '晴朗';
                    let Icon = CloudSun;

                    if (code === 0) { condition = '晴朗'; Icon = isDay ? Sun : Moon; }
                    else if (code >= 1 && code <= 3) { condition = '多云'; Icon = Cloud; }
                    else if (code >= 45 && code <= 48) { condition = '雾'; Icon = CloudFog; }
                    else if (code >= 51 && code <= 67) { condition = '细雨'; Icon = CloudDrizzle; }
                    else if (code >= 71 && code <= 77) { condition = '雪'; Icon = Snowflake; }
                    else if (code >= 80 && code <= 82) { condition = '阵雨'; Icon = CloudRain; }
                    else if (code >= 95) { condition = '雷雨'; Icon = CloudLightning; }

                    setWeather({
                        temp: data.current_weather.temperature,
                        condition,
                        icon: Icon,
                        city: cityName
                    });
                }
            } catch (e) {
                console.error("Weather fetch failed", e);
            } finally {
                setLoading(false);
            }
        };

        // Try geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    // If in China, maybe default to Chengdu/Shanghai coord if exact city name lookup is too complex without API key
                    // For now, let's just use the coords and a generic name or "Current Location"
                    // Or purely for aesthetics, default to a major hub like Chengdu/Shanghai
                    fetchWeather(pos.coords.latitude, pos.coords.longitude, '当前位置');
                },
                () => {
                    // Fallback to Chengdu (30.6586, 104.0648)
                    fetchWeather(30.6586, 104.0648, '成都');
                }
            );
        } else {
            fetchWeather(30.6586, 104.0648, '成都');
        }
    }, []);

    if (loading) return (
        <div className="h-full flex flex-col justify-between animate-pulse">
            <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full"></div>
            <div className="space-y-2">
                <div className="h-2 w-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
            </div>
        </div>
    );

    if (!weather) return null;

    const Icon = weather.icon;

    return (
        <>
            <Icon className="text-zinc-600 dark:text-zinc-400 group-hover:text-amber-500 mb-auto transition-colors" size={24} strokeWidth={1.5} />
            <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{weather.city}</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">{weather.condition} <span className="text-zinc-300 dark:text-zinc-600 font-light mx-1">|</span> {weather.temp}°</p>
            </div>
        </>
    )
}