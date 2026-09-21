/**
 * useGeocoder —— 地理编码 composable。对应 react-bmap 的 useGeocoder。
 * getPoint(address) 地址转坐标 / getLocation(point) 坐标转地址（单发，requestId 防竞态）。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { getSDK } from '../utils/sdk';
import { useServiceTimeout, serviceTimeoutError, SERVICE_TIMEOUT_MS } from './useServiceTimeout';
import type { Point } from '../types';
import type { GeocoderResult } from '../types/results';

export interface GeocoderHookResult {
  data: Ref<GeocoderResult | Point | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  getPoint: (address: string, city?: string) => void;
  getLocation: (point: Point, options?: unknown) => void;
  getPoints: (addresses: string[], city?: string) => Promise<(Point | null)[]>;
  getLocations: (points: Point[], options?: unknown) => Promise<(GeocoderResult | null)[]>;
  setOptions: (options: Record<string, unknown>) => void;
  cancel: () => void;
}

export function useGeocoder(): GeocoderHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<GeocoderResult | Point | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const handle = driver.createGeocoder();
    if (handle.isNull) {
      supported.value = false;
      error.value = new UnsupportedCapabilityError('Geocoder', driver.version);
      return;
    }
    raw = handle.raw;
    supported.value = true;
    error.value = null;
  };
  watch(() => bmap.value.driver, init, { immediate: true });
  onScopeDispose(() => { raw = null; });

  const doAction = (fn: (r: any) => void) => {
    if (!raw) return;
    const my = requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my === requestId) { loading.value = false; error.value = serviceTimeoutError(); } });
    try { fn(raw); }
    catch (e) { clear(); loading.value = false; error.value = e as Error; }
  };

  const getPoint = (address: string, city?: string) => {
    const my = ++requestId;
    doAction((r) => {
      const cb = (result: any) => { if (my !== requestId) return; clear(); data.value = result; loading.value = false; error.value = null; };
      if (city !== undefined) r.getPoint?.(address, cb, city); else r.getPoint?.(address, cb);
    });
  };
  const getLocation = (point: Point, options?: unknown) => {
    const my = ++requestId;
    doAction((r) => {
      const SDK = getSDK();
      const pt = new SDK.Point(point.lng, point.lat);
      const cb = (result: any) => { if (my !== requestId) return; clear(); data.value = result; loading.value = false; error.value = null; };
      if (options !== undefined) r.getLocation?.(pt, cb, options); else r.getLocation?.(pt, cb);
    });
  };
  const getPoints = (addresses: string[], city?: string) => Promise.all(addresses.map((address) => new Promise<Point | null>((resolve) => {
    if (!raw) return resolve(null);
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, SERVICE_TIMEOUT_MS);
    const cb = (result: Point | null) => { if (done) return; done = true; clearTimeout(t); resolve(result ?? null); };
    if (city !== undefined) raw.getPoint?.(address, cb, city); else raw.getPoint?.(address, cb);
  })));
  const getLocations = (points: Point[], options?: unknown) => Promise.all(points.map((point) => new Promise<GeocoderResult | null>((resolve) => {
    if (!raw) return resolve(null);
    const SDK = getSDK();
    const pt = new SDK.Point(point.lng, point.lat);
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, SERVICE_TIMEOUT_MS);
    const cb = (result: GeocoderResult | null) => { if (done) return; done = true; clearTimeout(t); resolve(result ?? null); };
    if (options !== undefined) raw.getLocation?.(pt, cb, options); else raw.getLocation?.(pt, cb);
  })));
  const setOptions = (options: Record<string, unknown>) => { raw?.setOptions?.(options); };
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, getPoint, getLocation, getPoints, getLocations, setOptions, cancel };
}
