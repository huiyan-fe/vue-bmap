/**
 * useWalkingRoute —— 步行路线规划 composable（Vue 3）。对应 react-bmap 的 useWalkingRoute。
 * SDK：search(Point, Point) / clearResults / enableAutoViewport / disableAutoViewport / setLocation / getStatus
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
import type { DrivingRouteOptions, DrivingRouteHookResult } from './useDrivingRoute';
import type { DrivingRouteResult } from '../types/results';

// 步行不支持 policy / alternatives（SDK WalkingRoute 构造函数不读 alternatives，
// 且强制 this._enableDragging=false，故 renderOptions.enableDragging 对步行无效）。
export type WalkingRouteOptions = Omit<DrivingRouteOptions, 'policy' | 'alternatives'>;
export type WalkingRouteHookResult = Omit<DrivingRouteHookResult, 'setPolicy'> & { setPolicy?: never };

export function useWalkingRoute(opts: WalkingRouteOptions = {}): WalkingRouteHookResult {
  const bmap = useBMapContext();
  const renderMap = useRenderMap(opts.renderOptions?.map);
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();
  let searchCb: ((results: unknown) => void) | null = null;
  let autoRenderFlag = false;
  let primed = false;

  const data = shallowRef<DrivingRouteResult | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const teardown = () => {
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
    if (dataOnly) delete ro.map;
    else if (map) ro.map = unwrapHandle(map);
    const searchOpts: Record<string, unknown> = {};
    if (opts.location !== undefined) {
      searchOpts.location = unwrapHandle(opts.location);
    } else {
      const loc = fallbackLocation(driver, map, dataOnly);
      if (loc !== '') searchOpts.location = loc;
    }
    if (Object.keys(ro).length > 0) searchOpts.renderOptions = ro;
    searchOpts.onSearchComplete = (results: unknown) => { searchCb?.(results); };
    if (opts.onMarkersSet) searchOpts.onMarkersSet = (pois: unknown[]) => opts.onMarkersSet?.(pois);
    if (opts.onInfoHtmlSet) searchOpts.onInfoHtmlSet = (poi: unknown, html: HTMLElement) => opts.onInfoHtmlSet?.(poi, html);
    if (opts.onPolylinesSet) searchOpts.onPolylinesSet = (pls: unknown[]) => opts.onPolylinesSet?.(pls);
    if (opts.onResultsHtmlSet) searchOpts.onResultsHtmlSet = (c: HTMLElement) => opts.onResultsHtmlSet?.(c);

    const handle = driver.createWalkingRoute(Object.keys(searchOpts).length > 0 ? searchOpts : undefined);
    if (handle.isNull) {
      data.value = undefined; loading.value = false; supported.value = false;
      error.value = new UnsupportedCapabilityError('WalkingRoute', driver.version);
      return;
    }
    raw = handle.raw;
    autoRenderFlag = ro.map != null;
    primed = false;
    if (typeof raw.setSearchCompleteCallback === 'function') {
      raw.setSearchCompleteCallback((results: unknown) => { searchCb?.(results); });
    }
    supported.value = true;
    error.value = null;
  };

  watch(
    () => [bmap.value.driver, stableStringify(opts.location), stableStringify({ ar: opts.autoRender, ro: opts.renderOptions }), renderMap.value] as const,
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
    return v;
  };

  const search = (start: unknown, end: unknown, _options?: { waypoints?: unknown[] }) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    const r = raw;
    const s = toPoint(start);
    const e = toPoint(end);
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
        try { r.search?.(s, e); } catch { /* noop */ }
      }
    };
    searchCb = cb;
    if (typeof r.setSearchCompleteCallback === 'function') r.setSearchCompleteCallback(cb);
    try { r.search?.(s, e); }
    catch (err) { clear(); if (my === requestId) { loading.value = false; error.value = err as Error; } }
  };

  const clearResults = () => { try { raw?.clearResults?.(); } catch { /* noop */ } data.value = undefined; loading.value = false; };
  const enableAutoViewport = () => { raw?.enableAutoViewport?.(); };
  const disableAutoViewport = () => { raw?.disableAutoViewport?.(); };
  const setLocation = (location: unknown) => { raw?.setLocation?.(unwrapHandle(location)); };
  const setPolylineStyle = (style: Record<string, unknown>) => { raw?.setPolylineStyle?.(style); };
  const getStatus = () => raw?.getStatus?.();
  const cancel = () => { requestId++; clear(); loading.value = false; };
  // setPolicy 不适用于 WalkingRoute
  const setPolicy = (_p: number) => {};

  return { data, loading, error, supported, search, clearResults, enableAutoViewport, disableAutoViewport, setPolicy, setLocation, setPolylineStyle, getStatus, cancel } as unknown as WalkingRouteHookResult;
}
