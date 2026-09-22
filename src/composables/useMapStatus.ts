/**
 * useMapStatus —— 订阅 Map 状态变化，返回响应式快照。
 * 对应 react-bmap 的 hooks/useMapStatus.ts（那边用 useSyncExternalStore，这里用 shallowRef + 事件订阅）。
 *
 * 关键：快照必须用「值」比较而不是「引用」比较。
 * 每次 readSnapshot 都返回新对象，但只要 lng/lat/zoom 等值不变，就不写入 ref（沿用旧引用）。
 *
 * driver getter 不再返回 undefined（DESIGN.md §12）：此处用 try/catch 包裹，
 * driver 在 throw 模式下抛错时该字段降级为 null；NaN 也视为 null（warn/ignore 模式返回 NaN）。
 */
import { inject, onScopeDispose, shallowRef, watch, type ShallowRef } from 'vue';
import { MAP_KEY } from '../context';
import type { BMapDriver } from '../drivers/types';
import type { Bounds, MapHandle, Point, Size } from '../types';

export interface MapSnapshot {
  center: Point | null;
  zoom: number | null;
  bounds: Bounds | null;
  size: Size | null;
  heading: number | null;
  tilt: number | null;
}

export function useMapStatus(): Readonly<ShallowRef<MapSnapshot | null>> {
  const mapCtx = inject(MAP_KEY, null);
  if (!mapCtx) throw new Error('[vue-bmap] useMapStatus 必须用在 <Map> 内部');

  const snapshot = shallowRef<MapSnapshot | null>(null);
  let cachedKey = '';
  let unsubs: Array<() => void> = [];

  const update = () => {
    const ctx = mapCtx.value;
    if (!ctx?.map) {
      snapshot.value = null;
      cachedKey = '';
      return;
    }
    const next = readSnapshot(ctx.map, ctx.driver);
    const key = snapshotKey(next);
    if (key === cachedKey) return;
    cachedKey = key;
    snapshot.value = next;
  };

  const bind = () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    const ctx = mapCtx.value;
    if (!ctx?.map) {
      snapshot.value = null;
      cachedKey = '';
      return;
    }
    const { map, driver } = ctx;
    const events = ['moveend', 'zoomend', 'resize', 'headingchange', 'tiltchange', 'moving', 'tilesloaded'];
    unsubs = events.map((evt) => driver.addEventListener(map, evt, update));
    update();
  };

  watch(() => mapCtx.value?.map, bind, { immediate: true });
  onScopeDispose(() => {
    unsubs.forEach((u) => u());
    unsubs = [];
  });

  return snapshot;
}

/** 基于值的稳定 key（避免浮点抖动，保留若干位小数；NaN 一致序列化为 'null'） */
function snapshotKey(s: MapSnapshot | null): string {
  if (!s) return '';
  const c = s.center;
  const b = s.bounds;
  const sz = s.size;
  const num = (n: number | null) => (n == null || Number.isNaN(n) ? 'null' : n.toFixed(3));
  return [
    c && !Number.isNaN(c.lng) ? `${c.lng.toFixed(7)},${c.lat.toFixed(7)}` : '',
    num(s.zoom),
    num(s.heading),
    num(s.tilt),
    b && !Number.isNaN(b.sw.lng) ? `${b.sw.lng.toFixed(5)},${b.sw.lat.toFixed(5)},${b.ne.lng.toFixed(5)},${b.ne.lat.toFixed(5)}` : '',
    sz ? `${sz.width.toFixed(0)}x${sz.height.toFixed(0)}` : '',
  ].join('|');
}

function readSnapshot(map: MapHandle, driver: BMapDriver): MapSnapshot {
  return {
    center: safePoint(() => driver.getCenter(map)),
    zoom: safeNum(() => driver.getZoom(map)),
    bounds: safeBounds(() => driver.getBounds(map)),
    size: safeSize(() => driver.getSize(map)),
    heading: safeNum(() => driver.getHeading(map)),
    tilt: safeNum(() => driver.getTilt(map)),
  };
}

function safePoint(fn: () => Point): Point | null {
  try {
    const p = fn();
    if (!p || Number.isNaN(p.lng) || Number.isNaN(p.lat)) return null;
    return p;
  } catch { return null; }
}

function safeNum(fn: () => number): number | null {
  try {
    const n = fn();
    return typeof n === 'number' && !Number.isNaN(n) ? n : null;
  } catch { return null; }
}

function safeBounds(fn: () => Bounds): Bounds | null {
  try {
    const b = fn();
    if (!b || Number.isNaN(b.sw.lng) || Number.isNaN(b.ne.lng)) return null;
    return b;
  } catch { return null; }
}

function safeSize(fn: () => Size): Size | null {
  try {
    const s = fn();
    if (!s) return null;
    return s;
  } catch { return null; }
}
