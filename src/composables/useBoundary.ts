/**
 * useBoundary —— 行政区划边界 composable。对应 react-bmap 的 useBoundary。
 * SDK 方法：get(name, callback)；requestId 防竞态，回调兜底超时。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import type { BoundaryResult } from '../types/results';

export interface BoundaryHookResult {
  data: Ref<BoundaryResult | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  get: (name: string) => void;
  /** 把 SDK 返回的边界字符串（"lng,lat;lng,lat;…"）解析成点集，对应 SDK parsebdStr，2.0.4 新增 */
  parsebdStr: (boundaryStr: string) => unknown;
  cancel: () => void;
}

export function useBoundary(): BoundaryHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<BoundaryResult | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const handle = driver.createBoundary();
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('Boundary', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    supported.value = true;
    error.value = null;
  };
  watch(() => bmap.value.driver, init, { immediate: true });
  onScopeDispose(() => { raw = null; });

  const get = (name: string) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    try {
      raw.get?.(name, (result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      });
    } catch (e) {
      clear();
      if (my === requestId) { loading.value = false; error.value = e as Error; }
    }
  };

  const parsebdStr = (boundaryStr: string): unknown => raw?.parsebdStr?.(boundaryStr);

  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, get, parsebdStr, cancel };
}
