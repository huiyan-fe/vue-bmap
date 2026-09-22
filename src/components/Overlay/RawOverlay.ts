/**
 * RawOverlay —— useRawOverlay 的组件糖。对应 react-bmap 的 components/Overlay/RawOverlay.tsx。
 *
 * 把任意继承 BMap.Overlay 的原生实例挂到 Vue 组件树上，库负责 addOverlay/removeOverlay。
 * 重建时机由 deps 控制；create 引用变化不会重建。
 *
 * ```vue
 * <RawOverlay
 *   :create="() => new MyOverlay(point)"
 *   :deps="[point.lng, point.lat]"
 *   :on-ready="(inst) => { instRef = inst; }"
 * />
 * ```
 */
import { defineComponent, type PropType } from 'vue';
import { useRawOverlay } from '../../composables/useRawOverlay';

export interface RawOverlayProps {
  /** 创建原生 Overlay 实例的工厂；仅在挂载 / deps 变化时调用 */
  create: () => unknown;
  /** 重建依赖，变化时销毁旧实例并用 create 重建（默认 []：只挂载一次） */
  deps?: unknown[];
  /** 实例创建并挂载后回调，用于拿到实例做命令式操作 */
  onReady?: (instance: unknown) => void;
}

export const RawOverlay = defineComponent({
  name: 'RawOverlay',
  props: {
    create: { type: Function as PropType<() => unknown>, required: true },
    deps: { type: Array as PropType<unknown[]>, default: (): unknown[] => [] },
    onReady: { type: Function as PropType<(instance: unknown) => void>, default: undefined },
  },
  setup(props) {
    useRawOverlay(
      () => props.create(),
      () => props.deps,
      (instance) => props.onReady?.(instance),
    );
    return () => null;
  },
});
