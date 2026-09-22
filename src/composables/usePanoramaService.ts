/**
 * usePanoramaService —— 全景服务 composable。对应 react-bmap 的 usePanoramaService。
 * SDK 方法：getPanoramaById(id, cb) / getPanoramaByLocation(point, radius?, cb) / getPanoramaByPOIId(poiId, cb)
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { getSDK } from '../utils/sdk';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import type { Point } from '../types';

export interface PanoramaServiceHookResult {
  data: Ref<unknown>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  getPanoramaById: (id: string) => void;
  /** radius 可选，缺省走 SDK 默认（约 50 米） */
  getPanoramaByLocation: (point: Point, radius?: number) => void;
  /** 按 POI id 查询全景（部分版本 SDK 支持；运行时不支持时置 error） */
  getPanoramaByPOIId: (poiId: string) => void;
  cancel: () => void;
}

export function usePanoramaService(): PanoramaServiceHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<unknown>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const handle = driver.createPanoramaService();
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('PanoramaService', driver.version);
      supported.value = false;
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
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    try {
      fn(raw);
    } catch (e) {
      clear();
      loading.value = false; error.value = e as Error;
    }
  };

  const getPanoramaById = (id: string) => {
    const my = ++requestId;
    doAction((r) => {
      r.getPanoramaById?.(id, (result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      });
    });
  };

  const getPanoramaByLocation = (point: Point, radius?: number) => {
    const my = ++requestId;
    doAction((r) => {
      const SDK = getSDK();
      const pt = new SDK.Point(point.lng, point.lat);
      const cb = (result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      };
      // radius 缺省时用二参重载，交给 SDK 默认半径
      if (typeof radius === 'number') r.getPanoramaByLocation?.(pt, radius, cb);
      else r.getPanoramaByLocation?.(pt, cb);
    });
  };

  const getPanoramaByPOIId = (poiId: string) => {
    const my = ++requestId;
    doAction((r) => {
      if (typeof r.getPanoramaByPOIId !== 'function') {
        clear();
        loading.value = false; error.value = new Error('getPanoramaByPOIId not supported by current SDK');
        return;
      }
      r.getPanoramaByPOIId(poiId, (result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      });
    });
  };

  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, getPanoramaById, getPanoramaByLocation, getPanoramaByPOIId, cancel };
}
