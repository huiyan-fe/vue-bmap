/**
 * PlaceDetailPanel —— 地点详情面板组件（独立面板模式）。对应 react-bmap 的 Overlay/PlaceDetailPanel.tsx。
 *
 * 与 PlaceDetail overlay 不同，此组件不需要 Marker，直接渲染到容器 DOM。
 * uid 变化时自动调用 render(uid)。卸载时自动 dispose。
 *
 * @since 4.0
 */
import {
  defineComponent, h, onMounted, onUnmounted, shallowRef, watch, type PropType, type StyleValue,
} from 'vue';
import { useBMapContext } from '../../context';
import { debugWarn } from '../../utils/debugWarn';
import type { PlaceDetailRenderOptions } from './PlaceDetail';

export interface PlaceDetailPanelProps {
  /** 地点 uid，变化时自动 render */
  uid?: string;
  /** 紧凑模式 */
  compact?: boolean;
  /** 渲染选项 */
  renderOptions?: PlaceDetailRenderOptions;
  /** 渲染完成回调（SDK 异步请求后触发） */
  onRender?: () => void;
  /** DOM 属性 */
  className?: string;
  style?: StyleValue;
}

export const PlaceDetailPanel = defineComponent({
  name: 'PlaceDetailPanel',
  props: {
    uid: { type: String, default: undefined },
    compact: { type: Boolean, default: undefined },
    renderOptions: { type: Object as PropType<PlaceDetailRenderOptions>, default: undefined },
    onRender: { type: Function as PropType<() => void>, default: undefined },
    className: { type: String, default: undefined },
    style: { default: undefined },
  },
  setup(props: any, { slots }) {
    const bmap = useBMapContext();
    const containerRef = shallowRef<HTMLDivElement | null>(null);
    let raw: any = null;

    // 创建/重建 PlaceDetail 实例
    const create = () => {
      const driver = bmap.value.driver;
      if (!driver || !containerRef.value) return;
      const opts: Record<string, unknown> = { container: containerRef.value };
      if (props.compact !== undefined) opts.compact = props.compact;
      if (props.renderOptions !== undefined) opts.renderOptions = props.renderOptions;

      const handle = driver.createPlaceDetail(opts);
      if (handle.isNull) return;
      raw = (handle as any).raw;

      // 实例创建后自动渲染当前 uid
      if (props.uid) {
        try { raw.render?.(props.uid); props.onRender?.(); } catch (e) { debugWarn('PlaceDetailPanel.render', e); }
      }
    };

    const destroy = () => {
      raw?.dispose?.();
      raw = null;
    };

    const recreate = () => { destroy(); create(); };

    onMounted(() => {
      create();
      // driver / compact / renderOptions 变化时重建
      watch(
        [() => bmap.value.driver, () => props.compact, () => JSON.stringify(props.renderOptions ?? null)],
        recreate,
      );
      // uid 变化时自动 render（实例未重建的情况）
      watch(() => props.uid, (uid) => {
        if (!raw || !uid) return;
        try { raw.render?.(uid); props.onRender?.(); } catch (e) { debugWarn('PlaceDetailPanel.render', e); }
      });
    });

    onUnmounted(destroy);

    return () => h(
      'div',
      { ref: containerRef, class: props.className, style: props.style as StyleValue },
      slots.default ? slots.default() : undefined,
    );
  },
});
