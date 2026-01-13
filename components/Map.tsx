'use client';

import { useEffect, useRef } from 'react';

// ✨ 核心修复：添加类型声明，解决 "Property 'AMap' does not exist" 报错
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

interface Marker {
  id: number;
  lat: number;
  lng: number;
  title: string;
  index?: number;
}

interface MapProps {
  className?: string;
  markers?: Marker[];
}

export default function Map({ className, markers = [] }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  // 初始化地图
  useEffect(() => {
    // 如果地图已经初始化，或者没有容器，跳过
    if (mapInstance.current || !mapContainer.current) return;

    const initMap = () => {
      // 再次检查 window.AMap 是否存在
      if (!window.AMap) return;

      const AMap = window.AMap;
      
      try {
        mapInstance.current = new AMap.Map(mapContainer.current, {
          zoom: 11,
          center: [135.7681, 35.0116], // 默认显示京都
          viewMode: '3D',
        });
        
        // 初始加载 markers
        updateMarkers();
      } catch (e) {
        console.error("Map init failed:", e);
      }
    };

    // 简单的加载检查逻辑
    if (window.AMap) {
      initMap();
    } else {
      // 如果你是在 layout.tsx 中通过 <Script> 加载的，这里等待加载完成
      // 实际项目中建议使用 @amap/amap-jsapi-loader
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          initMap();
          clearInterval(checkInterval);
        }
      }, 500);
      
      // 5秒后超时停止检查
      setTimeout(() => clearInterval(checkInterval), 5000);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 更新标记点的逻辑
  const updateMarkers = () => {
    if (!mapInstance.current || !window.AMap) return;
    
    const map = mapInstance.current;
    const AMap = window.AMap;

    // 清除旧点
    map.clearMap();

    // 添加新点
    markers.forEach((marker) => {
      if (marker.lat && marker.lng) {
        const m = new AMap.Marker({
          position: new AMap.LngLat(marker.lng, marker.lat),
          title: marker.title,
        });
        map.add(m);
      }
    });

    // 自动缩放视野以包含所有点
    if (markers.length > 0) {
      map.setFitView();
    }
  };

  // 监听 markers 变化
  useEffect(() => {
    updateMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  return <div ref={mapContainer} className={className} />;
}