/**
 * useSymbol —— 创建 Symbol 值对象（非 Overlay），用作 Marker 的 icon。
 * path 变化时重建；其余选项走 setOverlayOptions 原地更新。返回响应式句柄（首帧为 null）。
 */
import { onScopeDispose, shallowRef, watch, type ShallowRef } from 'vue';
import { useBMapContext } from '../context';
import { stableStringify } from '../utils/stableStringify';
import type { OverlayHandle } from '../types';
import type { SymbolProps } from '../components/Overlay/types';

const OPT_KEYS = ['fillColor', 'fillOpacity', 'scale', 'rotation', 'strokeColor', 'strokeOpacity', 'strokeWeight', 'anchor'] as const;

export function useSymbol(props: SymbolProps): ShallowRef<OverlayHandle | null> {
  const bmap = useBMapContext();
  const handle = shallowRef<OverlayHandle | null>(null);
  let current: OverlayHandle | null = null;

  const pickOpts = () => OPT_KEYS.reduce<Record<string, unknown>>((acc, k) => {
    const v = (props as any)[k];
    if (v !== undefined && v !== null) acc[k] = v;
    return acc;
  }, {});

  // path 或 driver 变化 → 重建
  watch(
    () => [bmap.value.driver, stableStringify((props as any).path)] as const,
    () => {
      const d = bmap.value.driver;
      if (!d) return;
      current = d.createSymbol((props as any).path, props);
      handle.value = current;
    },
    { immediate: true },
  );

  // 其余选项 → setOverlayOptions
  watch(() => stableStringify(pickOpts()), () => {
    const d = bmap.value.driver;
    if (d && current) d.setOverlayOptions(current, pickOpts());
  });

  onScopeDispose(() => { current = null; handle.value = null; });
  return handle;
}
