'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import AMapLoader from '@amap/amap-jsapi-loader'

interface Props {
  onSelect: (item: { name: string; address: string; lat: number; lng: number }) => void;
  onCancel: () => void;
}

export default function LocationSearch({ onSelect, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const AutoCompleteRef = useRef<any>(null);

  // 初始化高德搜索插件
  useEffect(() => {
    // 🌟 核心修复：必须在这里也配置安全密钥，否则搜索请求会被拒绝
    (window as any)._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE,
    };

    AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
      version: "2.0",
      plugins: ['AMap.AutoComplete'], // 加载搜索插件
    }).then((AMap) => {
      // city: '全国' 表示不限制城市，你可以改成 '成都'
      AutoCompleteRef.current = new AMap.AutoComplete({ city: '全国' });
    }).catch(e => console.log(e));
  }, []);

  // 执行搜索
  useEffect(() => {
    if (!query.trim() || !AutoCompleteRef.current) {
      setResults([]);
      return;
    }
    
    // 防抖：用户停止输入 500ms 后再搜索，防止请求太快
    const timer = setTimeout(() => {
      setLoading(true);
      AutoCompleteRef.current.search(query, (status: string, result: any) => {
        setLoading(false);
        if (status === 'complete' && result.tips) {
          // 过滤掉没有经纬度的结果 (高德有时候会返回空坐标的建议)
          setResults(result.tips.filter((item: any) => item.location && item.id));
        } else {
          setResults([]);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* 搜索头 */}
        <div className="p-4 border-b border-zinc-100 flex gap-3 items-center shrink-0">
          <Search className="text-zinc-400 w-5 h-5" />
          <input
            autoFocus
            className="flex-1 outline-none text-zinc-800 placeholder:text-zinc-400 font-medium text-lg"
            placeholder="搜索地点 (如：春熙路)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onCancel} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200">
            <X size={16} className="text-zinc-600"/>
          </button>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 flex justify-center text-zinc-400"><Loader2 className="animate-spin" /></div>
          )}
          
          {!loading && results.length === 0 && query && (
            <div className="p-6 text-center text-zinc-400 text-sm">
              <p>🤔 没找到这个地方</p>
              <p className="text-xs mt-1">试试输入更完整的名字？</p>
            </div>
          )}

          {results.map((item, i) => (
            <button
              key={i}
              className="w-full text-left p-4 hover:bg-blue-50 flex gap-3 border-b border-zinc-50 last:border-none transition-colors group"
              onClick={() => {
                onSelect({
                  name: item.name,
                  address: (typeof item.district === 'string' ? item.district : '') + (typeof item.address === 'string' ? item.address : ''),
                  lat: item.location.lat,
                  lng: item.location.lng
                });
              }}
            >
              <div className="mt-1 bg-zinc-100 group-hover:bg-blue-200 p-2 rounded-full h-fit transition-colors">
                <MapPin size={16} className="text-zinc-500 group-hover:text-blue-600" />
              </div>
              <div>
                <div className="font-bold text-zinc-800 text-base">{item.name}</div>
                <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-[240px]">
                  {typeof item.district === 'string' ? item.district : ''}
                  {typeof item.address === 'string' ? item.address : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {/* 底部版权 (可选) */}
        <div className="p-2 bg-zinc-50 text-[10px] text-zinc-300 text-center">
          Powered by AMap
        </div>
      </div>
    </div>
  );
}