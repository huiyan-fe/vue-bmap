import { computed, type ComputedRef } from 'vue';
import { useBMapContext } from '../context';
import type { Capability } from '../types';

/** 显式能力检测（driver 内部已自动处理；这里用于提前分支）。响应式集合。 */
export function useCapabilities(): ComputedRef<ReadonlySet<Capability>> {
  const bmap = useBMapContext();
  return computed(() => bmap.value.driver?.capabilities ?? new Set<Capability>());
}
