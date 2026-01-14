'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Calendar, ArrowRight, MoreHorizontal, LayoutGrid, Heart, MapPin, 
  CloudSun, LogIn, LogOut, User as UserIcon, Settings, X, Moon, Sun, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu"; // 确保路径正确

interface Trip {
  id: number;
  created_at: string;
  title: string;
  start_date: string | null;
  cover_image: string | null;
  is_public: boolean;
  user_id: string;
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();
  
  // 🌤️ 天气数据
  const [weather] = useState({ temp: 24, condition: 'Sunny', city: 'Chengdu' });

  // 🛠️ UI 状态管理
  const [showCreateModal, setShowCreateModal] = useState(false); // 新建行程弹窗
  const [newTripTitle, setNewTripTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false); // 设置弹窗
  const [isDarkMode, setIsDarkMode] = useState(false); // 深色模式状态

  // 1. 初始化
  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setAuthChecking(false);
        fetchTrips();
        
        // 检查本地存储的主题设置
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    };

    init();

    const channel = supabase.channel('trips_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        fetchTrips();
    });

    return () => { 
        supabase.removeChannel(channel); 
        authListener.subscription.unsubscribe();
    };
  }, []);

  // 切换深色模式
  const toggleTheme = () => {
      if (isDarkMode) {
          document.documentElement.classList.remove('dark');
          localStorage.theme = 'light';
          setIsDarkMode(false);
      } else {
          document.documentElement.classList.add('dark');
          localStorage.theme = 'dark';
          setIsDarkMode(true);
      }
  };

  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Fetch trips error:', error.message);
    else setTrips((data as any[]) || []);
    setLoading(false);
  };

  // 打开创建弹窗
  const handleOpenCreate = () => {
    if (!user) {
        router.push('/login'); 
        return;
    }
    setNewTripTitle('');
    setShowCreateModal(true);
  };

  // 提交创建行程
  const confirmCreateTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTripTitle.trim()) return;

      setIsCreating(true);
      const randomCover = `https://images.unsplash.com/photo-${['1476514525535-07fb3b4ae5f1', '1501785888041-af3ef285b470', '1469854523086-cc02fe5d8800', '1493976040374-85c8e12f0c0e'][Math.floor(Math.random() * 4)]}?w=800&auto=format&fit=crop`;

      const { error } = await supabase.from('trips').insert([
        { 
            title: newTripTitle, 
            start_date: new Date().toISOString(), 
            cover_image: randomCover,
            user_id: user.id
        }
      ]);
      
      setIsCreating(false);
      setShowCreateModal(false);
      
      if (error) alert("创建失败: " + error.message);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); e.stopPropagation();
    if(!confirm("确定要删除这个行程吗？")) return;
    await supabase.from('trips').delete().match({ id });
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setTrips([]);
      router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300 pb-20">
      
      {/* 🌟 1. 设置弹窗 Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSettingsModal(false)}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold">通用设置</h3>
                    <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6">
                    {/* 深色模式开关 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                {isDarkMode ? <Moon size={20}/> : <Sun size={20}/>}
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">深色模式</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{isDarkMode ? '已开启' : '已关闭'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={toggleTheme}
                            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isDarkMode ? "bg-indigo-600" : "bg-zinc-200")}
                        >
                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ml-1", isDarkMode ? "translate-x-5" : "translate-x-0")}/>
                        </button>
                    </div>

                    {/* 账号信息展示 */}
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">账号信息</h4>
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.email}</p>
                                <p className="text-xs text-zinc-500">已登录</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 🌟 2. 新建行程弹窗 Modal (替代 window.prompt) */}
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
                            {isCreating && <Loader2 size={16} className="animate-spin"/>}
                            创建行程
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

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
                    <a href="#" className="text-[11px] font-medium bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700 px-3 py-1 rounded-full transition-all">My Trips</a>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {authChecking ? (
                    <div className="w-7 h-7 rounded-full bg-zinc-100 animate-pulse"></div>
                ) : user ? (
                    <div className="flex items-center gap-3">
                        {authChecking ? (
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
                        ) : user ? (
                            <div className="flex items-center gap-3">
                                {/* 显示用户名 (大屏幕显示) */}
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                                    {user.email?.split('@')[0]}
                                </div>

                                {/* ✨ 这里替换为新的组件 ✨ */}
                                <UserMenu 
                                    user={user} 
                                    onLogout={handleLogout} 
                                    onOpenSettings={() => setShowSettingsModal(true)} 
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
                ) : (
                    <Link href="/login">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-full hover:opacity-90 transition-all shadow-sm">
                            <LogIn size={12} /> 登录
                        </button>
                    </Link>
                )}
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧边栏 (修改版) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
            <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <UserIcon size={20} />
                </div>
                <div>
                    {/* 2. 修改 Workspace 显示 */}
                    <h3 className="text-sm font-semibold">{user ? user.email?.split('@')[0] : 'Guest'}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Personal Space</p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-24 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <CloudSun className="text-zinc-400 group-hover:text-amber-500 mb-auto transition-colors" size={20} strokeWidth={1.5} />
                <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Current Weather</p>
                    <p className="text-sm font-semibold">{weather.condition} / {weather.temp}°C</p>
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-2">Collections</h3>
                <a href="#" className="group flex items-center justify-between px-2.5 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-800 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Heart size={15} className=""/>
                        <span className="text-sm font-medium">My Trips</span>
                    </div>
                    <span className="text-xs font-medium">{trips.length}</span>
                </a>
            </div>
        </aside>

        {/* 右侧列表区 */}
        <div className="col-span-1 lg:col-span-9 space-y-6">
            
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h1 className="text-xl font-semibold tracking-tight">Recent Trips</h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Sort by:</span>
                    <select className="bg-transparent text-xs font-medium border-none focus:ring-0 p-0 cursor-pointer outline-none dark:bg-zinc-950">
                        <option>Newest First</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <div key={i} className="h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse"/>)}
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
                                
                                {user && user.id === trip.user_id && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                         <button onClick={(e) => handleDelete(e, trip.id)} className="bg-white/90 backdrop-blur text-red-500 p-1.5 rounded-md hover:bg-white hover:text-red-600 transition-colors shadow-sm">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                )}

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

                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Date TBD'}
                                    </span>
                                </div>
                                <button className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-xs font-medium py-2 rounded-lg group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 group-hover:border-zinc-900 dark:group-hover:border-white transition-all flex items-center justify-center gap-2">
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

      {/* 🌟 悬浮添加按钮 (改为了 handleOpenCreate 触发弹窗) */}
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