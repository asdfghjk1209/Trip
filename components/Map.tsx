'use client'

import { useEffect, useRef } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

interface Props {
  className?: string;
  // 🌟 新增 isTentative 字段
  markers?: { id: number; lat: number; lng: number; title: string; index: number; isTentative?: boolean }[];
}

export default function Map({ className, markers = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    (window as any)._AMapSecurityConfig = { securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE };
    AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
      version: "2.0",
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MoveAnimation'],
    }).then((AMap) => {
      if (!mapRef.current) return;
      const map = new AMap.Map(mapRef.current, {
        viewMode: "2D", zoom: 11, center: [104.06, 30.67], mapStyle: 'amap://styles/whitesmoke',
      });
      mapInstance.current = map;
      return () => map.destroy();
    }).catch((e) => console.log(e));
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.AMap) return;
    const map = mapInstance.current;
    const AMap = window.AMap;

    map.clearMap(); // 清除所有覆盖物

    if (markers.length === 0) return;

    const path: any[] = [];
    
    // 🌟 核心逻辑：先筛选出“有效”的点（非暂定）来画线
    const validMarkers = markers.filter(m => !m.isTentative);

    markers.forEach((item) => {
      if (!item.lat || !item.lng) return;
      const position = new AMap.LngLat(item.lng, item.lat);
      
      // 如果是有效点，加入路径
      const isValid = !item.isTentative;
      if (isValid) path.push(position);

      // 计算它在“有效序列”中的序号 (视觉上的序号)
      const visualIndex = validMarkers.findIndex(vm => vm.id === item.id) + 1;

      // 样式区分：暂定的点是灰色的，确定的点是蓝色的
      const bg = isValid ? '#4F46E5' : '#A1A1AA'; // Indigo-600 vs Zinc-400
      const zIndex = isValid ? 100 : 50;
      const opacity = isValid ? 1 : 0.6;

      const content = `
        <div style="display:flex;flex-direction:column;align-items:center;opacity:${opacity}">
          <div style="background:${bg}; color:white; font-size:12px; font-weight:bold; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.2); border:2px solid white;">
            ${isValid ? visualIndex : '?'}
          </div>
          <div style="background:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; color:#333; margin-top:4px; box-shadow:0 2px 4px rgba(0,0,0,0.1); white-space:nowrap;">
            ${item.title}
          </div>
        </div>
      `;

      const marker = new AMap.Marker({
        position: position, content: content, anchor: 'bottom-center', offset: new AMap.Pixel(0, 0), zIndex: zIndex
      });
      map.add(marker);
    });

    // 只连接有效点
    if (path.length > 1) {
      const polyline = new AMap.Polyline({
        path: path, strokeColor: "#4F46E5", strokeWeight: 6, strokeOpacity: 0.8, isOutline: true, outlineColor: '#ffffff', showDir: true,
      });
      map.add(polyline);
    }
    
    if(path.length > 0) map.setFitView(null, false, [60, 60, 60, 60]);

  }, [markers]);

  return <div ref={mapRef} className={`w-full h-full rounded-xl overflow-hidden ${className}`} />;
}