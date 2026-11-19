/**
 * 数据可视化图层测试页共用数据生成 helper（4.0+ Visualization）。
 * 生成北京城区（lng 116.3~116.5 / lat 39.9~40.05）范围内的随机点 / 折线 / 多边形 GeoJSON。
 *
 * - randomPoints(count, withText?)    → FeatureCollection + Point，properties 带 id / name（withText 时额外带 text）
 * - randomPolylines(count)            → FeatureCollection + LineString（北京城区几条折线），properties 带 id / name
 * - randomPolygons(count, shape)      → FeatureCollection + Polygon（中心点 + 半径生成方形 / 三角形），properties 带 id / name
 */

const LNG_MIN = 116.3;
const LNG_MAX = 116.5;
const LAT_MIN = 39.9;
const LAT_MAX = 40.05;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** 随机点：FeatureCollection + Point，properties 带 id/name（withText 时额外带 text，供 TextLayer 默认文案） */
export function randomPoints(count: number, withText = false): any {
  const features = Array.from({ length: count }, (_, i) => {
    const name = `点${i}`;
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [rand(LNG_MIN, LNG_MAX), rand(LAT_MIN, LAT_MAX)] },
      properties: { id: i, name, ...(withText ? { text: name } : {}) },
    };
  });
  return { type: 'FeatureCollection', features };
}

const LINE_NAMES = ['长安街', '二环', '三环', '四环', '中轴线', '平安大街', '广安大街', '朝阳路'];

/** 随机折线：北京城区内 count 条 LineString，每条 5~8 个点 */
export function randomPolylines(count: number): any {
  const features = Array.from({ length: count }, (_, i) => {
    const n = 5 + Math.floor(Math.random() * 4); // 5~8 个点
    const coordinates = Array.from({ length: n }, () => [rand(LNG_MIN, LNG_MAX), rand(LAT_MIN, LAT_MAX)]);
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { id: i, name: LINE_NAMES[i % LINE_NAMES.length] },
    };
  });
  return { type: 'FeatureCollection', features };
}

/** 以中心点 + 半径生成闭合环坐标：方形或三角形 */
function ringAround(center: [number, number], rLng: number, rLat: number, shape: 'square' | 'triangle'): number[][] {
  const [cx, cy] = center;
  if (shape === 'triangle') {
    const pts: number[][] = [
      [cx, cy + rLat],
      [cx + rLng, cy - rLat],
      [cx - rLng, cy - rLat],
    ];
    return [...pts, pts[0]]; // 闭合
  }
  return [
    [cx - rLng, cy - rLat],
    [cx + rLng, cy - rLat],
    [cx + rLng, cy + rLat],
    [cx - rLng, cy + rLat],
    [cx - rLng, cy - rLat],
  ];
}

/** 随机多边形：count 个面，中心点 + 半径生成方形 / 三角形 */
export function randomPolygons(count: number, shape: 'square' | 'triangle' = 'square'): any {
  const features = Array.from({ length: count }, (_, i) => {
    const center: [number, number] = [rand(LNG_MIN + 0.005, LNG_MAX - 0.005), rand(LAT_MIN + 0.005, LAT_MAX - 0.005)];
    const ring = ringAround(center, rand(0.004, 0.012), rand(0.003, 0.009), shape);
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { id: i, name: `区域${i + 1}` },
    };
  });
  return { type: 'FeatureCollection', features };
}
