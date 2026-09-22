/**
 * CustomControl —— slot 内容渲染成自定义控件。
 * 对应 react-bmap 的 components/Control/CustomControl.tsx（React 用 createPortal，这里用 <Teleport>）。
 *
 * 手动建一个容器 div，交给 driver.createCustomControl(domCreate) 挂到地图容器上
 * （固定像素位置，不随地图平移缩放），再把默认插槽渲染进这个容器。
 *
 * 与 CustomOverlay 的本质区别：CustomOverlay 绑定地理坐标（point），会随地图移动；
 * CustomControl 固定于地图容器的像素位置（anchor + offset），不随地图移动。
 */
import {
  Teleport, defineComponent, h, inject, onUnmounted, watch, type PropType,
} from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import type { ControlHandle, Size } from '../../types';
import type { ControlAnchor } from '../../constants';

export interface CustomControlProps {
  /** 停靠位置，默认由 SDK 决定（通常为左上角） */
  anchor?: ControlAnchor;
  /** 相对停靠位置的像素偏移 */
  offset?: Size;
  /** 控制显示/隐藏。undefined 或 true = 显示，false = 隐藏 */
  visible?: boolean;
}

/** 只能构造时设置、变化需重建的 prop */
const CTOR_ONLY_PROPS = ['anchor', 'offset'] as const;

export const CustomControl = defineComponent({
  name: 'CustomControl',
  props: {
    anchor: { type: Number as PropType<ControlAnchor>, default: undefined },
    offset: { type: Object as PropType<Size>, default: undefined },
    visible: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <CustomControl> 必须用在 <Map> 内部');

    const p = props as unknown as Record<string, unknown>;
    const container = typeof document !== 'undefined' ? document.createElement('div') : null;

    let control: ControlHandle | null = null;

    const pickCtorOptions = (): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of CTOR_ONLY_PROPS) {
        const v = p[k];
        if (v !== undefined && v !== null) out[k] = v;
      }
      return out;
    };

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !container) return;
      const el = container;
      const c = ctx.driver.createCustomControl(() => el, pickCtorOptions());
      if (!c) return;
      control = c;
      ctx.driver.addControl(ctx.map, c);
      if (props.visible === false) ctx.driver.hideControl(c);
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (control && ctx?.map) {
        try { ctx.driver.removeControl(ctx.map, control); } catch { /* ignore */ }
      }
      control = null;
    };

    // map / ctor prop 变化 → 重建
    watch(
      [() => mapCtx.value?.map, () => stableStringify(CTOR_ONLY_PROPS.map((k) => p[k]))],
      () => { destroy(); create(); },
      { immediate: true },
    );
    // 可见性
    watch(() => props.visible, (v) => {
      const ctx = mapCtx.value;
      if (!control || !ctx?.driver) return;
      if (v === false) ctx.driver.hideControl(control);
      else ctx.driver.showControl(control);
    });

    onUnmounted(destroy);

    return () => (container ? h(Teleport, { to: container }, slots.default ? slots.default() : []) : null);
  },
});
