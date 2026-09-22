/**
 * FillLayer —— 面填充图层（手写组件）。@since 4.0
 * 对应 react-bmap 的 Layer/FillLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <FillLayer border :style="{ fillColor: 'rgba(0,100,255,0.4)', strokeColor: '#ff6600', strokeWeight: 3 }"
 *   :data="geojson" enable-picked />
 * ```
 *
 * 实现要点（与 react 对齐）：
 * - mount → driver.createFillLayer + addLayer
 * - data 变化 → raw.setData()
 * - style 变化 → raw.setStyleOptions() + raw.doOnceDraw()（运行时更新，不重建图层）
 * - visible/opacity/zIndex/minZoom/maxZoom 走对应 setter 平滑更新，不重建图层
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

/** 数据驱动样式表达式，如 ['match', ['get', 'name'], '海淀区', 'red', '#aecde8'] */
export type FillStyleExpr = unknown[];

export interface FillLayerStyle {
  fillColor?: string | FillStyleExpr;
  fillOpacity?: number | FillStyleExpr;
  pattern?: boolean;
  patternMask?: boolean;
  patternUrl?: string;
  patternMapping?: string;
  patternScale?: number;
  patternOffset?: string;
  sequence?: boolean;
  marginLength?: number;
  borderCovered?: boolean;
  borderMask?: boolean;
  borderWeight?: number | FillStyleExpr;
  borderColor?: string | FillStyleExpr;
  strokeTextureUrl?: string;
  strokeTextureWidth?: number;
  strokeTextureHeight?: number;
  strokeLineJoin?: string;
  strokeLineCap?: string;
  strokeColor?: string | FillStyleExpr;
  strokeWeight?: number | FillStyleExpr;
  strokeOpacity?: number | FillStyleExpr;
  strokeStyle?: string;
  dashArray?: number[];
  height?: number | FillStyleExpr;
  [k: string]: unknown;
}

export interface FillLayerOptions {
  border?: boolean;
  style?: FillLayerStyle;
  idKey?: string;
  crs?: string;
  isFlat?: boolean;
  drawPart?: boolean;
  selectedIndex?: number;
  selectedColor?: string;
  enablePicked?: boolean;
  /** 拾取时是否自动切换 selectedIndex（配合 feature-state 高亮时通常设 false，自己控制状态） */
  enableChangeSelectIndexByPick?: boolean;
  autoSelect?: boolean;
  popEvent?: boolean;
  pickWidth?: number;
  pickHeight?: number;
  /** 命中要素时是否自动改变鼠标样式 */
  mouseStyleChange?: boolean;
  /** 参考中心点（Point） */
  referCenter?: unknown;
  isTop?: boolean;
  isLowText?: boolean;
  // ─── 受控选项（变化走对应 setter 平滑更新，不重建图层）───
  visible?: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
}

/** 图层拾取事件对象（enablePicked=true 时点击/命中要素） */
export interface FillLayerEvent {
  value?: { dataIndex?: number; dataItem?: { properties?: Record<string, unknown>; [k: string]: unknown }; [k: string]: unknown };
  [k: string]: unknown;
}

export interface FillLayerProps extends FillLayerOptions {
  /** GeoJSON 数据源，变化时调用 raw.setData() */
  data?: object;
  /** setData 第二参（如 { changeCenter: true } 自动定位到数据范围） */
  setDataParams?: object;
  /** 点击要素（需 enablePicked）。e.value.dataItem.properties 为选中要素属性 */
  onClick?: (e: FillLayerEvent) => void;
  /** 双击要素（需 enablePicked） */
  onDblClick?: (e: FillLayerEvent) => void;
  onRightClick?: (e: FillLayerEvent) => void;
  /** 鼠标在要素上移动（需 enablePicked）。SDK 不派发 mouseover/mouseout */
  onMouseMove?: (e: FillLayerEvent) => void;
  /** 图层挂载后回调，拿到原生 FillLayer 实例做命令式操作（如 updateState/clearState） */
  onReady?: (layer: any) => void;
}

// SDK LayerNormalMgr 只派发 click/dblclick/rightclick/mousemove 四种
const LAYER_EVENTS: Array<{ sdk: string; prop: keyof FillLayerProps }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'dblclick', prop: 'onDblClick' },
  { sdk: 'rightclick', prop: 'onRightClick' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const FillLayer = defineComponent({
  name: 'FillLayer',
  props: {
    border: { type: Boolean, default: undefined },
    style: { type: Object as PropType<FillLayerStyle>, default: undefined },
    idKey: { type: String, default: undefined },
    crs: { type: String, default: undefined },
    isFlat: { type: Boolean, default: undefined },
    drawPart: { type: Boolean, default: undefined },
    selectedIndex: { type: Number, default: undefined },
    selectedColor: { type: String, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    enableChangeSelectIndexByPick: { type: Boolean, default: undefined },
    autoSelect: { type: Boolean, default: undefined },
    popEvent: { type: Boolean, default: undefined },
    pickWidth: { type: Number, default: undefined },
    pickHeight: { type: Number, default: undefined },
    mouseStyleChange: { type: Boolean, default: undefined },
    referCenter: { default: undefined },
    isTop: { type: Boolean, default: undefined },
    isLowText: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    data: { type: Object as PropType<object>, default: undefined },
    setDataParams: { type: Object as PropType<object>, default: undefined },
    onClick: { type: Function as PropType<(e: FillLayerEvent) => void>, default: undefined },
    onDblClick: { type: Function as PropType<(e: FillLayerEvent) => void>, default: undefined },
    onRightClick: { type: Function as PropType<(e: FillLayerEvent) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: FillLayerEvent) => void>, default: undefined },
    onReady: { type: Function as PropType<(layer: any) => void>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <FillLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    // ctorKey 含构造期选项 + style。
    // 注意：SDK 的 setStyleOptions() 只能运行时更新填充，stroke/border 相关样式是构造期建立的渲染，
    // 运行时改不生效（必须重建图层）。所以把 style 也纳入 ctorKey，任一样式字段变化即重建，保证及时生效。
    const ctorKey = computed(() => stableStringify([
      props.border, props.idKey, props.crs, props.isFlat, props.drawPart,
      props.selectedIndex, props.selectedColor, props.enablePicked, props.enableChangeSelectIndexByPick,
      props.autoSelect, props.popEvent, props.pickWidth, props.pickHeight,
      props.mouseStyleChange, props.isTop, props.isLowText,
      props.style,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('border', props.border); put('style', props.style);
      put('idKey', props.idKey); put('crs', props.crs); put('isFlat', props.isFlat); put('drawPart', props.drawPart);
      put('selectedIndex', props.selectedIndex); put('selectedColor', props.selectedColor);
      put('enablePicked', props.enablePicked); put('enableChangeSelectIndexByPick', props.enableChangeSelectIndexByPick);
      put('autoSelect', props.autoSelect); put('popEvent', props.popEvent);
      put('pickWidth', props.pickWidth); put('pickHeight', props.pickHeight);
      put('mouseStyleChange', props.mouseStyleChange); put('referCenter', props.referCenter);
      put('isTop', props.isTop); put('isLowText', props.isLowText);
      // 受控字段的初始值也随构造传入（后续变化走 setter）
      put('visible', props.visible); put('opacity', props.opacity);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);

      const h = driver.createFillLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      // 绑定图层事件：调用时现读最新回调，随图层重建（ctorKey）重绑
      if (h.raw) {
        for (const { sdk, prop } of LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: FillLayerEvent) => void) | undefined;
            if (typeof fn === 'function') fn(e as FillLayerEvent);
          }));
        }
      }

      // mount 后如果有 data，立即 setData
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data, props.setDataParams); } catch (e) { debugWarn('FillLayer.setData', e); }
      }

      // 暴露原生 layer 实例，供命令式调用
      props.onReady?.((h.raw as any));
    };

    const destroy = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // data 变化 → setData
    watch(() => stableStringify(props.data), () => {
      if (!handle?.raw || !props.data) return;
      try { (handle.raw as any).setData?.(props.data, props.setDataParams); } catch { /* noop */ }
    });

    // style 变化已并入 ctorKey（走重建）——SDK 对 stroke/border 样式不支持运行时 setStyleOptions 生效。

    // 受控选项 → 对应 setter 平滑更新，不重建图层
    watch(() => props.visible, (v) => { if (handle?.raw && v !== undefined) try { (handle.raw as any).setVisible?.(v); } catch { /* noop */ } });
    watch(() => props.opacity, (v) => { if (handle?.raw && v !== undefined) try { (handle.raw as any).setOpacity?.(v); } catch { /* noop */ } });
    watch(() => props.zIndex, (v) => { if (handle?.raw && v !== undefined) try { (handle.raw as any).setZIndex?.(v); } catch { /* noop */ } });
    watch(() => props.minZoom, (v) => { if (handle?.raw && v !== undefined) try { (handle.raw as any).setMinZoom?.(v); } catch { /* noop */ } });
    watch(() => props.maxZoom, (v) => { if (handle?.raw && v !== undefined) try { (handle.raw as any).setMaxZoom?.(v); } catch { /* noop */ } });

    onUnmounted(destroy);
    return () => null;
  },
});
