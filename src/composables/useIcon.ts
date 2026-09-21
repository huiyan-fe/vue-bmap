/**
 * useIcon —— 创建 Icon 值对象（非 Overlay），用作 Marker 的 icon。
 * url 变化时重建；其余选项走 setOverlayOptions。返回响应式句柄（首帧为 null）。
 */
import { onScopeDispose, shallowRef, watch, type ShallowRef } from 'vue';
import { useBMapContext } from '../context';
import { stableStringify } from '../utils/stableStringify';
import type { OverlayHandle } from '../types';
import type { IconProps } from '../components/Overlay/types';

const OPT_KEYS = ['size', 'anchor', 'imageOffset', 'imageSize', 'infoWindowAnchor', 'printImageUrl', 'srcset'] as const;

export function useIcon(props: IconProps): ShallowRef<OverlayHandle | null> {
  const bmap = useBMapContext();
  const handle = shallowRef<OverlayHandle | null>(null);
  let current: OverlayHandle | null = null;

  const pickOpts = () => OPT_KEYS.reduce<Record<string, unknown>>((acc, k) => {
    const v = (props as any)[k];
    if (v !== undefined && v !== null) acc[k] = v;
    return acc;
  }, {});

  // url 或 driver 变化 → 重建
  watch(
    () => [bmap.value.driver, (props as any).url] as const,
    () => {
      const d = bmap.value.driver;
      if (!d) return;
      current = d.createIcon((props as any).url, (props as any).size, props);
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
