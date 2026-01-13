'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, ArrowRight, MoreHorizontal, LayoutGrid, Heart, MapPin, CloudSun, LogIn, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface Trip {
  id: number;
  created_at: string;
  title: string;
  start_date: string | null;
  cover_image: string | null;
  is_public: boolean;
  user_id: string; // 确保前端类型也有这个字段
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // ✨ 新增：用户状态
  const [authChecking, setAuthChecking] = useState(true); // ✨ 新增：正在检查登录状态
  const router = useRouter();
  
  // 🌤️ 天气数据状态
  const [weather] = useState({ temp: 24, condition: 'Sunny', city: 'Chengdu' });

  // 1. 初始化：检查用户 + 获取数据
  useEffect(() => {
    const init = async () => {
        // 先检查当前用户
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setAuthChecking(false);

        // 获取行程数据 (RLS 会自动根据 user 过滤数据)
        fetchTrips();
    };

    init();

    // 监听数据变化 (实时更新)
    const channel = supabase.channel('trips_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .subscribe();

    // 监听登录状态变化 (例如用户在其他标签页登录/登出)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        fetchTrips(); // 状态变了重新拉取数据
    });

    return () => { 
        supabase.removeChannel(channel); 
        authListener.subscription.unsubscribe();
    };
  }, []);

  // 获取行程数据
  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        // 忽略 406 错误 (有时 RLS 返回空会导致) 或网络错误
        console.error('Fetch trips error:', error.message);
    } else {
        setTrips((data as any[]) || []);
    }
    setLoading(false);
  };

  // 创建新行程
  const handleCreateTrip = async () => {
    if (!user) {
        router.push('/login'); 
        return;
    }

    const title = window.prompt("给这次旅行起个名字吧 (例如：京都赏樱)");
    if (!title) return;

    const randomCover = `https://images.unsplash.com/photo-${['1476514525535-07fb3b4ae5f1', '1501785888041-af3ef285b470', '1469854523086-cc02fe5d8800', '1493976040374-85c8e12f0c0e'][Math.floor(Math.random() * 4)]}?w=800&auto=format&fit=crop`;

    const { error } = await supabase.from('trips').insert([
        { 
            title, 
            start_date: new Date().toISOString(), 
            cover_image: randomCover,
            user_id: user.id // 必填：用于 RLS 鉴权
        }
    ]);
    
    if (error) alert("创建失败: " + error.message);
  };

  // 删除行程
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm("确定要删除这个行程吗？")) return;
    await supabase.from('trips').delete().match({ id });
  };

  // 登出
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setTrips([]); // 清空列表
      router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pb-20">
      
      {/* 1. 顶部导航 */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <a href="#" className="flex items-center gap-2 group">
                    <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center text-white shadow-lg shadow-zinc-900/20">
                       <LayoutGrid size={14} />
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-zinc-900">TripSync</span>
                </a>
                <div className="hidden md:flex items-center gap-1 bg-zinc-100/50 p-1 rounded-full border border-zinc-200/50">
                    <a href="#" className="text-[11px] font-medium text-zinc-900 bg-white shadow-sm border border-zinc-200/50 px-3 py-1 rounded-full">Library</a>
                    <a href="#" className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 px-3 py-1 transition-colors">Explore</a>
                </div>
            </div>
            
            {/* ✨ 右侧：根据登录状态显示不同内容 */}
            <div className="flex items-center gap-3">
                {authChecking ? (
                    // 加载中占位
                    <div className="w-7 h-7 rounded-full bg-zinc-100 animate-pulse"></div>
                ) : user ? (
                    // 已登录：显示头像和登出
                    <div className="flex items-center gap-3">
                        <div className="text-xs text-zinc-500 hidden sm:block">{user.email?.split('@')[0]}</div>
                        <div className="group relative">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center ring-1 ring-zinc-200 cursor-pointer overflow-hidden">
                                {user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/>
                                ) : (
                                    <span className="text-xs font-bold">{user.email?.[0].toUpperCase()}</span>
                                )}
                            </div>
                            {/* Dropdown Menu (Simple) */}
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-zinc-100 p-1 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2">
                                    <LogOut size={12}/> 退出登录
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 未登录：显示登录按钮
                    <Link href="/login">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-full hover:bg-zinc-800 transition-all shadow-sm">
                            <LogIn size={12} /> 登录
                        </button>
                    </Link>
                )}
            </div>
        </div>
      </nav>

      {/* 2. 主要内容区 */}
      <main className="max-w-7xl mx-auto px-4 pt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧边栏 */}
        <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
            <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <UserIcon size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{user ? 'My Workspace' : 'Guest Mode'}</h3>
                    <p className="text-xs text-zinc-500">{user ? 'Free Plan' : 'Please login'}</p>
                </div>
            </div>

            {/* 天气卡片 */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm flex flex-col justify-between h-24 group hover:border-zinc-300 transition-colors">
                <CloudSun className="text-zinc-400 group-hover:text-amber-500 mb-auto transition-colors" size={20} strokeWidth={1.5} />
                <div>
                    <p className="text-xs text-zinc-500">Current Weather</p>
                    <p className="text-sm font-semibold text-zinc-900">{weather.condition} / {weather.temp}°C</p>
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider px-2 mb-2">Collections</h3>
                <a href="#" className="group flex items-center justify-between px-2.5 py-2 rounded-md bg-zinc-100 border border-zinc-200/50 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Heart size={15} className="text-zinc-900"/>
                        <span className="text-sm font-medium text-zinc-900">My Trips</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-900">{trips.length}</span>
                </a>
            </div>
        </aside>

        {/* 右侧列表区 */}
        <div className="col-span-1 lg:col-span-9 space-y-6">
            
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Recent Trips</h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Sort by:</span>
                    <select className="bg-transparent text-xs font-medium text-zinc-700 border-none focus:ring-0 p-0 cursor-pointer outline-none">
                        <option>Newest First</option>
                    </select>
                </div>
            </div>

            {/* 列表内容 */}
            {loading ? (
                // Loading Skeleton
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <div key={i} className="h-64 bg-zinc-100 rounded-xl animate-pulse"/>)}
                </div>
            ) : trips.length === 0 ? (
                // 空状态
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                        <MapPin size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                        {user ? '还没开始计划？' : '请先登录'}
                    </h3>
                    <p className="text-zinc-500 text-sm mb-6">
                        {user ? '点击右下角按钮，开启你的探索之旅。' : '登录后即可创建和管理您的行程。'}
                    </p>
                    {!user && (
                        <Link href="/login">
                            <button className="px-6 py-2 bg-zinc-900 text-white rounded-full font-medium text-sm hover:bg-zinc-800 transition-all shadow-lg">
                                去登录
                            </button>
                        </Link>
                    )}
                </div>
            ) : (
                // 列表状态
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {trips.map((trip) => (
                      <Link href={`/plan/${trip.id}`} key={trip.id} className="block group">
                        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-zinc-300 transition-all duration-300 relative h-full flex flex-col">
                            {/* 封面图 */}
                            <div className="relative h-48 overflow-hidden bg-zinc-100">
                                <img 
                                    src={trip.cover_image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"} 
                                    alt={trip.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                
                                {/* 删除按钮 (仅作者可见) */}
                                {user && user.id === trip.user_id && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                         <button onClick={(e) => handleDelete(e, trip.id)} className="bg-white/90 backdrop-blur text-red-500 p-1.5 rounded-md hover:bg-white hover:text-red-600 transition-colors shadow-sm">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* 底部信息 */}
                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                    <div className="flex gap-2 mb-2">
                                        <span className="text-[10px] font-medium bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                                            Planning
                                        </span>
                                        {trip.is_public && <span className="text-[10px] font-medium bg-emerald-500/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">Public</span>}
                                    </div>
                                    <h3 className="font-semibold tracking-tight text-lg leading-tight mb-1 truncate">{trip.title}</h3>
                                </div>
                            </div>

                            {/* 下方详情 */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Date TBD'}
                                    </span>
                                </div>
                                <button className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-medium py-2 rounded-lg group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all flex items-center justify-center gap-2">
                                    View Plan <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all"/>
                                </button>
                            </div>
                        </div>
                      </Link>
                    ))}
                </div>
            )}
        </div>
      </main>

      {/* 🌟 悬浮添加按钮 (未登录不显示) */}
      {user && (
          <div className="fixed bottom-8 right-8 z-50 animate-in zoom-in duration-300">
            <button onClick={handleCreateTrip} className="bg-zinc-900 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all border-2 border-white/20">
                <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
      )}
    </div>
  );
}