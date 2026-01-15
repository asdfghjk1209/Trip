import { NextResponse } from 'next/server';

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || process.env.AMAP_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    try {
        // 1. 优先尝试高德地图 (如果配置了 Key)
        if (AMAP_KEY) {
            // https://lbs.amap.com/api/webservice/guide/api/inputtips
            const amapUrl = `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(query)}&datatype=poi`;
            const amapRes = await fetch(amapUrl);
            const amapData = await amapRes.json();

            if (amapData.status === '1' && amapData.tips) {
                const results = amapData.tips
                    .filter((tip: any) => tip.location && tip.location.length > 0) // 过滤掉没有坐标的数据
                    .map((tip: any) => {
                        const [lng, lat] = tip.location.split(',');
                        return {
                            name: tip.name,
                            address: tip.district + (tip.address && typeof tip.address === 'string' ? tip.address : ''),
                            lat: parseFloat(lat),
                            lng: parseFloat(lng),
                            source: 'amap'
                        };
                    });
                return NextResponse.json(results);
            }
        }

        // 2. 只有当没有Key或高德失败时，回退到 Nominatim (OSM)
        // 增加 accepts-language 提高中文匹配率
        const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&accept-language=zh-CN&countrycodes=cn&addressdetails=1`;
        const osmRes = await fetch(osmUrl, {
            headers: {
                'User-Agent': 'TripSync-App/1.0' // 礼貌做法
            }
        });

        if (!osmRes.ok) {
            // 可能是网络问题或 OSM 限制
            return NextResponse.json([]);
        }

        const osmText = await osmRes.text();
        let osmData;
        try {
            osmData = JSON.parse(osmText);
        } catch (e) {
            return NextResponse.json([]);
        }

        const results = osmData.map((item: any) => ({
            name: item.name || item.display_name?.split(',')[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            source: 'osm'
        }));

        return NextResponse.json(results);

    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
    }
}
