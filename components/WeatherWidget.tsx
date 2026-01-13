'use client'

import { CloudRain, Sun, Cloud, Wind, Droplets } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// 模拟的天气数据类型
interface WeatherData {
  temp: number;
  condition: 'Sunny' | 'Rainy' | 'Cloudy';
  humidity: number;
  wind: string;
  tips: string;
}

export default function WeatherWidget({ city = "Chengdu" }: { city?: string }) {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    // 模拟 API 请求
    // 真实场景可以用: https://www.weatherapi.com/ 或高德天气 API
    const mockData: WeatherData = {
      temp: 24,
      condition: Math.random() > 0.5 ? 'Sunny' : 'Cloudy', // 随机一下看效果
      humidity: 65,
      wind: "2级",
      tips: "今日宜穿棉麻面料衬衫，早晚温差适中，适合漫步街头。"
    };
    setData(mockData);
  }, []);

  if (!data) return <div className="h-32 bg-zinc-100 rounded-xl animate-pulse" />;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-6 text-white shadow-lg transition-all hover:scale-[1.02]",
      data.condition === 'Sunny' ? "bg-gradient-to-br from-orange-400 to-rose-400" : 
      data.condition === 'Rainy' ? "bg-gradient-to-br from-blue-400 to-slate-500" : 
      "bg-gradient-to-br from-blue-300 to-indigo-400"
    )}>
      <div className="relative z-10 flex justify-between items-start">
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
               <MapPinIcon className="w-4 h-4" /> {city}
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tighter">{data.temp}°</span>
                <span className="text-sm opacity-90">{data.condition}</span>
            </div>
        </div>
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-full shadow-inner">
           {data.condition === 'Sunny' ? <Sun size={32} className="animate-spin-slow" /> : 
            data.condition === 'Rainy' ? <CloudRain size={32} /> : <Cloud size={32} />}
        </div>
      </div>
      
      <div className="relative z-10 mt-6 pt-4 border-t border-white/20 flex gap-6 text-xs font-medium opacity-90">
         <div className="flex items-center gap-1"><Droplets size={12}/> 湿度 {data.humidity}%</div>
         <div className="flex items-center gap-1"><Wind size={12}/> 东南风 {data.wind}</div>
      </div>
      
      <div className="relative z-10 mt-3 text-xs bg-black/10 p-2 rounded-lg backdrop-blur-sm">
         💡 {data.tips}
      </div>

      {/* 装饰性背景光晕 */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/5 rounded-full blur-3xl"></div>
    </div>
  );
}

function MapPinIcon({className}: {className?: string}) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
}