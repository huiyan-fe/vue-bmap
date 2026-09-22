/**
 * useDrivingRoute —— 驾车路线规划 composable（Vue 3）。对应 react-bmap 的 useDrivingRoute。
 *
 * SDK 方法：search(start: Point|LocalResultPoi, end: Point|LocalResultPoi, { waypoints? })
 * / getResults / clearResults / enableAutoViewport / disableAutoViewport
 * / setPolicy / setLocation / getStatus / setSearchCompleteCallback ...
 *
 * 注意：search 不接受字符串地址，只接受 Point 或 LocalResultPoi。
 */
import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { stableStringify } from '../utils/stableStringify';
import { isHandle, unwrapHandle } from '../utils/handle';
import { useRenderMap } from './useRenderMap';
import { fallbackLocation } from './renderHelpers';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import { getSDK } from '../utils/sdk';
import type { Point, MapHandle } from '../types';
import type { DrivingRouteResult } from '../types/results';

export interface DrivingRouteRenderOptions {
  /**
   * 在地图上渲染路线用的 MapHandle。**非必传**：
   * - composable 用在 `<Map>` **内部**（子树里）时，不传会自动取当前地图；
   * - composable 用在 `<Map>` **外层**时，context 取不到，需显式传**已就绪**的 handle（非 null）。
   * 显式传入始终优先于自动获取。
   */
  map?: MapHandle;
  panel?: string | HTMLElement;
  selectFirstResult?: boolean;
  autoViewport?: boolean;
  viewportOptions?: { noAnimation?: boolean; margins?: number[]; zoomFactor?: number };
  /** 拖拽起终点重新规划（仅驾车/公交/货车生效；步行、骑行 SDK 内部强制关闭）。 */
  enableDragging?: boolean;
}

export interface DrivingRouteOptions {
  /**
   * 检索上下文（城市/坐标/地图）。**非必传**：缺省时自动回退到当前 `<Map>`（或 `renderOptions.map`）。
   * 只在需要指定特定城市时才显式传。
   */
  location?: string | MapHandle;
  policy?: number;
  /** 是否同时返回多条备选路线（对应 SDK DrivingRoute 构造项 alternatives）。仅驾车支持。 */
  alternatives?: boolean;
  /**
   * 是否自动在地图上渲染路线（默认 true）。传 `false`＝**仅取数据**：不注入 renderOptions.map，
   * 缺省 location 时用地图中心点（而非 Map 实例）作检索上下文。
   */
  autoRender?: boolean;
  renderOptions?: DrivingRouteRenderOptions;
  onSearchComplete?: (results: DrivingRouteResult) => void;
  onMarkersSet?: (pois: unknown[]) => void;
  onInfoHtmlSet?: (poi: unknown, html: HTMLElement) => void;
  onPolylinesSet?: (polylines: unknown[]) => void;
  onResultsHtmlSet?: (container: HTMLElement) => void;
}

export interface DrivingRouteHookResult {
  data: Ref<DrivingRouteResult | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  /** 搜索（start/end 必须是 Point，不支持字符串地址） */
  search: (start: Point, end: Point, options?: { waypoints?: Point[] }) => void;
  clearResults: () => void;
  enableAutoViewport: () => void;
  disableAutoViewport: () => void;
  setPolicy: (policy: number) => void;
  setLocation: (location: string | MapHandle) => void;
  /** 运行时设置路线折线样式（strokeColor / strokeWeight / strokeOpacity 等） */
  setPolylineStyle: (style: Record<string, unknown>) => void;
  getStatus: () => number | undefined;
  cancel: () => void;
}

export function useDrivingRoute(opts: DrivingRouteOptions = {}): DrivingRouteHookResult {
  const bmap = useBMapContext();
  const renderMap = useRenderMap(opts.renderOptions?.map);
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();
  let searchCb: ((results: unknown) => void) | null = null;
  // 首搜渲染竞态兜底：自动渲染实例首次完成后同参补搜一次，确保首帧出线（每实例一次）。
  let autoRenderFlag = false;
  let primed = false;

  const data = shallowRef<DrivingRouteResult | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const teardown = () => {
    // SDK 的 clearResults 在 renderer 的 map 未就绪/已卸载时会抛，这里必须吞掉。
    try { raw?.clearResults?.(); } catch { /* noop */ }
    raw = null;
    searchCb = null;
  };

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const map = renderMap.value;
    const dataOnly = opts.autoRender === false;
    const ro: Record<string, unknown> = {};
    if (opts.renderOptions) Object.assign(ro, opts.renderOptions);
    if (dataOnly) delete ro.map;                       // 仅取数据：不注入地图 → 不自动渲染路线
    else if (map) ro.map = unwrapHandle(map);

    const searchOpts: Record<string, unknown> = {};
    // location 缺省时回退到当前 <Map>（dataOnly 用中心点而非 Map，避免自动渲染）
    if (opts.location !== undefined) {
      searchOpts.location = unwrapHandle(opts.location);
    } else {
      const loc = fallbackLocation(driver, map, dataOnly);
      if (loc !== '') searchOpts.location = loc;
    }
    if (opts.policy !== undefined) searchOpts.policy = opts.policy;
    if (opts.alternatives !== undefined) searchOpts.alternatives = opts.alternatives;
    if (Object.keys(ro).length > 0) searchOpts.renderOptions = ro;
    searchOpts.onSearchComplete = (results: unknown) => { searchCb?.(results); };
    if (opts.onMarkersSet) searchOpts.onMarkersSet = (pois: unknown[]) => opts.onMarkersSet?.(pois);
    if (opts.onInfoHtmlSet) searchOpts.onInfoHtmlSet = (poi: unknown, html: HTMLElement) => opts.onInfoHtmlSet?.(poi, html);
    if (opts.onPolylinesSet) searchOpts.onPolylinesSet = (pls: unknown[]) => opts.onPolylinesSet?.(pls);
    if (opts.onResultsHtmlSet) searchOpts.onResultsHtmlSet = (c: HTMLElement) => opts.onResultsHtmlSet?.(c);

    const handle = driver.createDrivingRoute(searchOpts);
    if (handle.isNull) {
      data.value = undefined; loading.value = false; supported.value = false;
      error.value = new UnsupportedCapabilityError('DrivingRoute', driver.version);
      return;
    }
    raw = handle.raw;
    // 新服务实例：记录是否自动渲染（带 map）、重置补发标记
    autoRenderFlag = ro.map != null;
    primed = false;
    if (typeof raw.setSearchCompleteCallback === 'function') {
      raw.setSearchCompleteCallback((results: unknown) => { searchCb?.(results); });
    }
    supported.value = true;
    error.value = null;
  };

  // driver / renderMap 变化时重建服务（driver 可能异步就绪、map 可能 null→ready）。
  // locKey/optKey 一并纳入以对齐 react 语义（opts 在 setup 后不变，主要驱动来自 driver/renderMap）。
  watch(
    () => [bmap.value.driver, stableStringify(opts.location), stableStringify({ policy: opts.policy, alternatives: opts.alternatives, ar: opts.autoRender, ro: opts.renderOptions }), renderMap.value] as const,
    (_n, _o, onCleanup) => { init(); onCleanup(teardown); },
    { immediate: true },
  );
  onScopeDispose(teardown);

  const toPoint = (v: unknown): unknown => {
    if (!v) return v;
    if (isHandle(v)) return v.raw;
    if (typeof v === 'object' && 'lng' in (v as object)) {
      const p = v as { lng: number; lat: number };
      return new (getSDK().Point)(p.lng, p.lat);
    }
    return v; // LocalResultPoi 或已转换的对象
  };

  const search = (start: unknown, end: unknown, options?: { waypoints?: unknown[] }) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    const r = raw;
    const s = toPoint(start);
    const e = toPoint(end);
    const wp = options?.waypoints ? { waypoints: options.waypoints.map(toPoint) } : undefined;

    const cb = (results: unknown) => {
      if (my !== requestId) return;
      clear();
      let actual = results;
      if (!actual || (typeof actual === 'object' && Object.keys(actual as object).length === 0)) {
        try { actual = r.getResults?.(); } catch { /* noop */ }
      }
      opts.onSearchComplete?.(actual as DrivingRouteResult);
      data.value = (actual ?? results) as DrivingRouteResult;
      loading.value = false; error.value = null; supported.value = true;
      if (autoRenderFlag && !primed) {
        primed = true;
        try { r.search?.(s, e, wp); } catch { /* noop */ }
      }
    };
    searchCb = cb;

    try { r.search?.(s, e, wp); }
    catch (err) { clear(); if (my === requestId) { loading.value = false; error.value = err as Error; } }
  };

  const clearResults = () => {
    try { raw?.clearResults?.(); } catch { /* SDK clearResults may crash if map state is stale */ }
    data.value = undefined; loading.value = false;
  };
  const enableAutoViewport = () => { raw?.enableAutoViewport?.(); };
  const disableAutoViewport = () => { raw?.disableAutoViewport?.(); };
  const setPolicy = (policy: number) => { raw?.setPolicy?.(policy); };
  const setLocation = (location: unknown) => { raw?.setLocation?.(unwrapHandle(location)); };
  const setPolylineStyle = (style: Record<string, unknown>) => { raw?.setPolylineStyle?.(style); };
  const getStatus = () => raw?.getStatus?.();
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, search, clearResults, enableAutoViewport, disableAutoViewport, setPolicy, setLocation, setPolylineStyle, getStatus, cancel };
}
