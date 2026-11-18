/**
 * 服务类 composable 的 `renderOptions.panel` 解包。
 *
 * panel 允许直接传 `ref<HTMLElement | null>()`：
 * - 元素就绪前 Ref.value 为 null → 移除 panel 键，避免把 Ref 对象/undefined 交给 SDK；
 * - Ref 值变化会经由 stableStringify（已解包 Ref）反映到依赖 key 上，触发 service 重建，
 *   因此「元素就绪后自动生效」不需要额外的 watch/onMounted 赋值。
 */
import { isRef, unref } from 'vue';

export function resolvePanelTarget(ro: Record<string, unknown>): void {
  if (!('panel' in ro)) return;
  const panel = isRef(ro.panel) ? unref(ro.panel) : ro.panel;
  if (panel === null || panel === undefined) delete ro.panel;
  else ro.panel = panel;
}
