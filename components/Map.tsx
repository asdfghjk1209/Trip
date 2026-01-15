'use client'

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- 修复 Leaflet 默认图标缺失的问题 ---
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- 自定义数字图标生成器 ---
const createNumberedIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="
      background-color: #4F46E5; 
      color: white; 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 12px; 
      font-weight: bold; 
      border: 2px solid white; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface MapProps {
  markers?: {
    id: number;
    lat: number;
    lng: number;
    title: string;
    index?: number;
  }[];
  className?: string;
}

// --- 核心组件：负责监听数据变化并自动调整视野 ---
function MapUpdater({ markers }: { markers: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      // 1. 提取所有坐标点
      const points = markers.map(m => [m.lat, m.lng] as [number, number]);

      // 2. 创建边界 (Bounds)
      const bounds = L.latLngBounds(points);

      // 3. 调整视野以包含所有点 (padding 避免点紧贴边缘)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]); // 依赖 markers，数据变了就执行

  return null;
}

export default function Map({ markers = [], className }: MapProps) {
  // 提取路径线坐标
  const polylinePositions = useMemo(() =>
    markers.map(m => [m.lat, m.lng] as [number, number]),
    [markers]);

  // 默认中心点 (成都)
  const defaultCenter = [30.6586, 104.0648] as [number, number];
  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] as [number, number] : defaultCenter;

  return (
    <div className={`relative z-0 ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      >
        {/* 1. 地图图层 (使用高德/OSM/CartoDB) */}
        {/* 方案 A: CartoDB Voyager (非常适合旅行风格，干净漂亮) */}
        {/* <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        /> */}

        {/* 方案 B: 如果你在国内觉得慢，可以用高德地图 (取消下面注释) */}
        <TileLayer
          url="https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
        />

        {/* 2. 路径连线 (虚线效果) */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#6366f1', weight: 3, dashArray: '5, 10', opacity: 0.6 }}
          />
        )}

        {/* 3. 标记点 */}
        {markers.map((marker, idx) => (
          <Marker
            key={`${marker.id}-${idx}`}
            position={[marker.lat, marker.lng]}
            icon={createNumberedIcon(idx)}
          >
            <Popup>
              <div className="font-bold text-sm">{marker.title}</div>
              <div className="text-xs text-gray-500">序号: {idx + 1}</div>
            </Popup>
          </Marker>
        ))}

        {/* 4. 自动更新器 */}
        <MapUpdater markers={markers} />

      </MapContainer>
    </div>
  );
}