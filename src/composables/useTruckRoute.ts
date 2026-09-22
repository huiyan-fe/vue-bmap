/**
 * useTruckRoute —— 货车路线规划 composable（Vue 3）。对应 react-bmap 的 useTruckRoute。
 * SDK 方法：search(start, end, { waypoints? }) / getResults / clearResults / setPolicy / setPageCapacity
 * / setIntercityPolicy / setTransitTypePolicy / setLocation / getStatus
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

// 货车不支持 alternatives（SDK TruckRoute 构造函数不读 alternatives，仅 DrivingRoute 支持）。
export type TruckRouteOptions = Omit<DrivingRouteOptions, 'alternatives'>;
export type TruckRouteHookResult = DrivingRouteHookResult & { setPageCapacity: (n: number) => void };

export function useTruckRoute(opts: TruckRouteOptions = {}): TruckRouteHookResult {
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
    if (opts.policy !== undefined) searchOpts.policy = opts.policy;
    if (Object.keys(ro).length > 0) searchOpts.renderOptions = ro;
    searchOpts.onSearchComplete = (results: unknown) => { searchCb?.(results); };
    if (opts.onMarkersSet) searchOpts.onMarkersSet = (pois: unknown[]) => opts.onMarkersSet?.(pois);
    if (opts.onInfoHtmlSet) searchOpts.onInfoHtmlSet = (poi: unknown, html: HTMLElement) => opts.onInfoHtmlSet?.(poi, html);
    if (opts.onPolylinesSet) searchOpts.onPolylinesSet = (pls: unknown[]) => opts.onPolylinesSet?.(pls);
    if (opts.onResultsHtmlSet) searchOpts.onResultsHtmlSet = (c: HTMLElement) => opts.onResultsHtmlSet?.(c);

    const handle = driver.createTruckRoute(searchOpts);
    if (handle.isNull) {
      data.value = undefined; loading.value = false; supported.value = false;
      error.value = new UnsupportedCapabilityError('TruckRoute', driver.version);
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
    () => [bmap.value.driver, stableStringify(opts.location), stableStringify({ policy: opts.policy, ar: opts.autoRender, ro: opts.renderOptions }), renderMap.value] as const,
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
    if (typeof r.setSearchCompleteCallback === 'function') r.setSearchCompleteCallback(cb);
    try { r.search?.(s, e, wp); }
    catch (err) { clear(); if (my === requestId) { loading.value = false; error.value = err as Error; } }
  };

  const clearResults = () => { try { raw?.clearResults?.(); } catch { /* noop */ } data.value = undefined; loading.value = false; };
  const enableAutoViewport = () => { raw?.enableAutoViewport?.(); };
  const disableAutoViewport = () => { raw?.disableAutoViewport?.(); };
  const setPolicy = (p: number) => { raw?.setPolicy?.(p); };
  const setPageCapacity = (n: number) => { raw?.setPageCapacity?.(n); };
  const setLocation = (location: unknown) => { raw?.setLocation?.(unwrapHandle(location)); };
  const setPolylineStyle = (style: Record<string, unknown>) => { raw?.setPolylineStyle?.(style); };
  const getStatus = () => raw?.getStatus?.();
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, search, clearResults, enableAutoViewport, disableAutoViewport, setPolicy, setPageCapacity, setLocation, setPolylineStyle, getStatus, cancel };
}
