/**
 * DOMLayer —— 自定义 DOM 覆盖物图层（手写组件）。@since 4.0
 * 对应 react-bmap 的 Layer/DOMLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <DOMLayer :create-d-o-m="(props, point) => el" :data="geojson" :min-zoom="5" enable-dragging-map />
 * ```
 *
 * 实现要点（与 react 对齐）：
 * - constructor: (createDOM, opts) —— 第一个参数是创建 DOM 的回调
 * - createDOM 常写成内联箭头函数，引用每次变化不该重建图层：用引用稳定的 wrapper
 *   传给 SDK，wrapper 内部现读最新 props.createDOM（Vue props 响应式，闭包天然读到最新）。
 * - data 变化 → raw.setData()，用 appliedDataKey 跳过 create 时已喂过的同一份数据，
 *   避免与 nextTick 定位（setTimeout）竞争导致 Cannot read properties of null。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface DOMLayerOptions {
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  offsetX?: number;
  offsetY?: number;
  anchors?: [number, number];
  coordinate?: string;
  enableDraggingMap?: boolean;
  /**
   * 延迟一拍定位（默认 true）：首次 draw 以 opacity=0 完成定位，setTimeout(0) 后用真实宽高
   * 重新定位再显示。消除「子元素宽度首次测量不准 → 二次 draw 位置跳变」的初始化抖动。
   * 仅首次渲染生效，不影响后续更新。需要严格同步显示时可传 false 关闭。
   */
  nextTick?: boolean;
  visible?: boolean;
  data?: object | null;
}

export interface DOMLayerProps extends DOMLayerOptions {
  /** 创建 DOM 元素的回调，接收 properties 和 point，返回 HTMLElement */
  createDOM: (properties: object, point: { lng: number; lat: number }) => HTMLElement;
  /** GeoJSON 数据源，变化时调用 raw.setData() */
  data?: object;
}

export const DOMLayer = defineComponent({
  name: 'DOMLayer',
  props: {
    createDOM: { type: Function as PropType<DOMLayerProps['createDOM']>, required: true },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    offsetX: { type: Number, default: undefined },
    offsetY: { type: Number, default: undefined },
    anchors: { type: Array as unknown as PropType<[number, number]>, default: undefined },
    coordinate: { type: String, default: undefined },
    enableDraggingMap: { type: Boolean, default: undefined },
    nextTick: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    data: { type: Object as PropType<object>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <DOMLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    // 已喂给当前 raw 的 data 指纹，供 data watch 跳过 create 时已应用的同一份数据
    let appliedDataKey: string | null = null;
    // 引用稳定的 createDOM wrapper：内部现读最新 props.createDOM
    const stableCreateDOM = (properties: object, point: { lng: number; lat: number }) => props.createDOM(properties, point);

    // nextTick 默认 true
    const nextTick = computed(() => props.nextTick ?? true);
    const dataKey = computed(() => (props.data ? stableStringify(props.data) : ''));

    // ctorKey：构造期选项 + nextTick + visible（createDOM 不进 ctorKey）
    const ctorKey = computed(() => stableStringify([
      props.minZoom, props.maxZoom, props.zIndex, props.offsetX, props.offsetY,
      props.anchors, props.coordinate, props.enableDraggingMap, nextTick.value, props.visible,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = { nextTick: nextTick.value };
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('offsetX', props.offsetX); put('offsetY', props.offsetY);
      put('anchors', props.anchors); put('coordinate', props.coordinate);
      put('enableDraggingMap', props.enableDraggingMap); put('visible', props.visible);

      const h = driver.createDOMLayer({ createDOM: stableCreateDOM, ...opts });
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      // mount 后如果有 data，立即 setData
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); appliedDataKey = dataKey.value; }
        catch (e) { debugWarn('DOMLayer.setData', e); }
      }
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
      appliedDataKey = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // data 变化 → setData（跳过 create 时已喂过的同一份数据）
    watch(dataKey, () => {
      if (!handle?.raw || !props.data) return;
      if (appliedDataKey === dataKey.value) return;
      try { (handle.raw as any).setData?.(props.data); appliedDataKey = dataKey.value; } catch { /* noop */ }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
