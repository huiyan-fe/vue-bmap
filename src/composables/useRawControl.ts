/**
 * useRawControl —— 把任意「继承 BMap.Control 的原生实例」挂到 Vue 组件树上，
 * 由库统一管理 addControl/removeControl 生命周期。对应 react-bmap 的 hooks/useRawControl.ts。
 *
 * 与内置控件组件（NavigationControl 等）的区别：内置组件封装好了；useRawControl 是
 * escape hatch，用户完全掌控 Control 子类的 initialize/DOM，库只管挂载卸载。
 *
 * ```ts
 * // 原生命名空间用全局 BMap（loader 已把 v4 的 BMapGL 归一为 window.BMap）；
 * // 想避开全局也可从 useDriver().rawSDK 取。
 * class MyControl extends BMap.Control { initialize(map) { ...return dom; } }
 * const instance = useRawControl(() => new MyControl(), () => [dep]);
 * ```
 *
 * @param create 创建原生 Control 实例的工厂；仅在挂载 / deps 变化时调用。
 * @param deps 重建依赖（ref / getter / 普通值）；变化时销毁旧实例并用 create 重建。
 * @param onCreate 实例创建并挂载后回调，用于拿到实例做命令式操作。
 * @returns 响应式实例引用（未挂载时为 null）。
 */
import {
  inject, onScopeDispose, shallowRef, toValue, watch,
  type MaybeRefOrGetter, type ShallowRef,
} from 'vue';
import { MAP_KEY } from '../context';
import { stableStringify } from '../utils/stableStringify';
import type { ControlHandle } from '../types';

export function useRawControl<T = unknown>(
  create: () => T,
  deps?: MaybeRefOrGetter<unknown>,
  onCreate?: (instance: T) => void,
): ShallowRef<T | null> {
  const mapCtx = inject(MAP_KEY, null);
  if (!mapCtx) throw new Error('[vue-bmap] useRawControl 必须用在 <Map> 内部');

  const instance = shallowRef<T | null>(null) as ShallowRef<T | null>;
  let handle: ControlHandle | null = null;

  const mount = () => {
    const ctx = mapCtx.value;
    if (!ctx?.map) return;
    const inst = create();
    instance.value = inst;
    // 把用户的原生实例包成 ControlHandle（driver.addControl 内部用 handle.raw 取原生对象）
    handle = { __brand: 'ControlHandle', raw: inst, type: 'raw' };
    ctx.driver.addControl(ctx.map, handle);
    onCreate?.(inst);
  };

  const unmount = () => {
    const ctx = mapCtx.value;
    if (handle && ctx?.map) {
      try { ctx.driver.removeControl(ctx.map, handle); } catch { /* ignore */ }
    }
    handle = null;
    instance.value = null;
  };

  // 重建时机只由 map 就绪与显式 deps 控制（create/onCreate 引用变化不重建）。
  watch(
    [() => mapCtx.value?.map, () => stableStringify(toValue(deps))],
    () => { unmount(); mount(); },
    { immediate: true },
  );

  onScopeDispose(unmount);

  return instance;
}
