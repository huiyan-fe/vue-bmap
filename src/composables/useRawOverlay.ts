/**
 * useRawOverlay —— 把任意「继承 BMap.Overlay 的原生实例」挂到 Vue 组件树上，
 * 由库统一管理 addOverlay/removeOverlay 生命周期。对应 react-bmap 的 hooks/useRawOverlay.ts。
 *
 * 适用场景：用户已有原生自定义覆盖物（自己写 initialize/draw 的 Overlay 子类），
 * 想在 Vue 里用，又不想每处都手写 inject(MAP_KEY) + addOverlay + cleanup 样板。
 *
 * 与 CustomOverlay 的区别：
 * - CustomOverlay：slot 内容渲染进 SDK 容器 DOM，用户不写 initialize/draw。
 * - useRawOverlay：用户完全掌控 initialize/draw（原生 Overlay 子类），库只管挂载卸载。
 *
 * ```ts
 * // 原生命名空间用全局 BMap（loader 已把 v4 的 BMapGL 归一为 window.BMap）；
 * // 想避开全局也可从 useDriver().rawSDK 取。
 * class MyOverlay extends BMap.Overlay { initialize(map) {...} draw() {...} }
 * const instance = useRawOverlay(() => new MyOverlay(point), () => [point.lng, point.lat]);
 * ```
 *
 * @param create 创建原生 Overlay 实例的工厂；仅在挂载 / deps 变化时调用。
 * @param deps 重建依赖（ref / getter / 普通值）；变化时销毁旧实例并用 create 重建。
 * @param onCreate 实例创建并挂载后回调，用于拿到实例做命令式操作。
 * @returns 响应式实例引用（未挂载时为 null）。
 */
import {
  inject, onScopeDispose, shallowRef, toValue, watch,
  type MaybeRefOrGetter, type ShallowRef,
} from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY } from '../context';
import { stableStringify } from '../utils/stableStringify';
import type { OverlayHandle } from '../types';

export function useRawOverlay<T = unknown>(
  create: () => T,
  deps?: MaybeRefOrGetter<unknown>,
  onCreate?: (instance: T) => void,
): ShallowRef<T | null> {
  const mapCtx = inject(MAP_KEY, null);
  if (!mapCtx) throw new Error('[vue-bmap] useRawOverlay 必须用在 <Map> 内部');
  // 若嵌套在 MarkerClusterer 等提供 OverlayTarget 的父级下，挂到父级；否则挂到 map。
  const target = inject(OVERLAY_TARGET_KEY, null);

  const instance = shallowRef<T | null>(null) as ShallowRef<T | null>;
  let handle: OverlayHandle | null = null;

  const mount = () => {
    const ctx = mapCtx.value;
    if (!ctx?.map) return;
    const inst = create();
    instance.value = inst;
    // 把用户的原生实例包成 OverlayHandle（driver.addOverlay 内部用 handle.raw 取原生对象）
    handle = { __brand: 'OverlayHandle', raw: inst, type: 'raw' };
    if (target?.addOverlay) target.addOverlay(handle);
    else ctx.driver.addOverlay(ctx.map, handle);
    onCreate?.(inst);
  };

  const unmount = () => {
    const ctx = mapCtx.value;
    if (handle) {
      try {
        if (target?.removeOverlay) target.removeOverlay(handle);
        else if (ctx?.map) ctx.driver.removeOverlay(ctx.map, handle);
      } catch { /* ignore */ }
    }
    handle = null;
    instance.value = null;
  };

  // 重建时机由 map 就绪、父级 target 就绪与显式 deps 控制（create/onCreate 引用变化不重建）。
  watch(
    [() => mapCtx.value?.map, () => target?.handle.value, () => stableStringify(toValue(deps))],
    () => { unmount(); mount(); },
    { immediate: true },
  );

  onScopeDispose(unmount);

  return instance;
}
