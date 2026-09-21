import { computed, type ComputedRef } from 'vue';
import { useBMapContext } from '../context';
import type { BMapDriver } from '../drivers/types';

/** 拿当前版本的 driver（响应式，未就绪时为 null）。做版本/能力分支或用 rawSDK 取原生命名空间。 */
export function useDriver(): ComputedRef<BMapDriver | null> {
  const bmap = useBMapContext();
  return computed(() => bmap.value.driver);
}
