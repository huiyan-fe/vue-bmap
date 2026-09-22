/**
 * useGeolocation —— 浏览器定位 composable。对应 react-bmap 的 useGeolocation。
 * SDK 方法：getCurrentPosition(callback, opts?) / getStatus() / enableSDKLocation() / disableSDKLocation()
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';

export interface GeolocationHookResult {
  data: Ref<unknown>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  getCurrentPosition: (options?: unknown) => void;
  getStatus: () => number | undefined;
  enableSDKLocation: () => void;
  disableSDKLocation: () => void;
  cancel: () => void;
}

export function useGeolocation(opts?: { enableSDKLocation?: boolean }): GeolocationHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();
  const optKey = JSON.stringify(opts ?? {});

  const data = ref<unknown>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const ctorOpts: Record<string, unknown> = {};
    if (opts?.enableSDKLocation) ctorOpts.SDKLocation = true;
    const handle = driver.createGeolocation(Object.keys(ctorOpts).length > 0 ? ctorOpts : undefined);
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('Geolocation', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    if (opts?.enableSDKLocation) raw?.enableSDKLocation?.();
    supported.value = true;
    error.value = null;
  };
  watch([() => bmap.value.driver, () => optKey], init, { immediate: true });
  onScopeDispose(() => { raw = null; });

  const getCurrentPosition = (options?: unknown) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    try {
      const cb = (result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      };
      if (options !== undefined) raw.getCurrentPosition?.(cb, options);
      else raw.getCurrentPosition?.(cb);
    } catch (e) {
      clear();
      if (my === requestId) { loading.value = false; error.value = e as Error; }
    }
  };

  const getStatus = (): number | undefined => raw?.getStatus?.();
  const enableSDKLocation = () => { raw?.enableSDKLocation?.(); };
  const disableSDKLocation = () => { raw?.disableSDKLocation?.(); };
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, getCurrentPosition, getStatus, enableSDKLocation, disableSDKLocation, cancel };
}
