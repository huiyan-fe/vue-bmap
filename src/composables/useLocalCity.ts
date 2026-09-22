/**
 * useLocalCity —— 城市定位 composable。对应 react-bmap 的 useLocalCity。
 * SDK 方法：get(callback)；requestId 防竞态，回调兜底超时。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import type { LocalCityResult } from '../types/results';

export interface LocalCityHookResult {
  data: Ref<LocalCityResult | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  get: () => void;
  cancel: () => void;
}

export function useLocalCity(): LocalCityHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<LocalCityResult | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const handle = driver.createLocalCity();
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('LocalCity', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    supported.value = true;
    error.value = null;
  };
  watch(() => bmap.value.driver, init, { immediate: true });
  onScopeDispose(() => { raw = null; });

  const get = () => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
    try {
      raw.get?.((result: any) => {
        if (my !== requestId) return;
        clear();
        data.value = result; loading.value = false; error.value = null; supported.value = true;
      });
    } catch (e) {
      clear();
      if (my === requestId) { loading.value = false; error.value = e as Error; }
    }
  };

  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, get, cancel };
}
