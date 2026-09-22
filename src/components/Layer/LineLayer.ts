/**
 * LineLayer —— 线图层（手写组件）。@since 4.0
 * 对应 react-bmap 的 Layer/LineLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <LineLayer selected-color="#ff7a45" :style="{ strokeColor: '#2a6cf6', strokeWeight: 6, strokeStyle: 'solid' }"
 *   :data="geojson" enable-picked />
 * ```
 *
 * 实现要点（与 react 对齐）：
 * - mount → driver.createLineLayer + addLayer
 * - data 变化 → raw.setData()
 * - style 变化 → raw.setStyleOptions() + raw.doOnceDraw()（运行时更新，不重建图层）
 * - visible/opacity/zIndex/minZoom/maxZoom 走对应 setter 平滑更新，不重建图层
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

/** 数据驱动样式表达式，如 ['match', ['get', 'name'], 'a', '#f00', '#00f']（SDK 表达式语法） */
export type LineStyleExpr = unknown[];

export interface LineLayerStyle {
  strokeColor?: string | LineStyleExpr;
  strokeWeight?: number | LineStyleExpr;
  strokeOpacity?: number | LineStyleExpr;
  strokeStyle?: string | LineStyleExpr;
  strokeLineCap?: string;
  strokeLineJoin?: string;
  borderColor?: string | LineStyleExpr;
  borderWeight?: number | LineStyleExpr;
  dashArray?: number[];
  strokeTextureUrl?: string | LineStyleExpr;
  strokeTextureWidth?: number | LineStyleExpr;
  strokeTextureHeight?: number;
  /** 是否按纹理序列渲染（贴图沿线重复） */
  sequence?: boolean;
  /** 纹理之间的间隔长度 */
  marginLength?: number;
  [k: string]: unknown;
}

export interface LineLayerOptions {
  style?: LineLayerStyle;
  // ─── 构造期选项（变化会重建图层）───
  idKey?: string;
  crs?: string;
  isFlat?: boolean;
  drawPart?: boolean;
  selectedColor?: string;
  selectedIndex?: number;
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
  // ─── LineLayer 专属折线/节点选项（构造期）───
  /** 是否渐变线 */
  isLinear?: boolean;
  /** 渐变纹理 */
  linearTexture?: unknown;
  nodeShow?: boolean;
  nodeMask?: boolean;
  nodeStrict?: boolean;
  nodeJoin?: boolean;
  nodeBreakpoint?: boolean;
  nodeMiddleShow?: boolean;
  nodeMinZoom?: number;
  linkLine?: boolean;
  // ─── 受控选项（变化走对应 setter 平滑更新，不重建图层）───
  visible?: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
}

/** 图层拾取事件对象（enablePicked=true 时点击/悬停命中要素；dataIndex=-1 表示点空白） */
export interface LineLayerEvent {
  value?: {
    dataIndex?: number;
    dataItem?: { properties?: Record<string, unknown>; [k: string]: unknown };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface LineLayerProps extends LineLayerOptions {
  /** GeoJSON 数据源，变化时调用 raw.setData() */
  data?: object;
  /** setData 第二参（如 { changeCenter: true } 自动定位到数据范围） */
  setDataParams?: object;
  /** 点击要素（需 enablePicked）。e.value.dataIndex 为命中要素索引，-1 表示点空白 */
  onClick?: (e: LineLayerEvent) => void;
  /** 双击要素（需 enablePicked） */
  onDblClick?: (e: LineLayerEvent) => void;
  onRightClick?: (e: LineLayerEvent) => void;
  /** 鼠标在要素上移动（需 enablePicked）。SDK 不派发 mouseover/mouseout */
  onMouseMove?: (e: LineLayerEvent) => void;
  /** 图层创建并挂载后回调，拿到原生 LineLayer 实例做命令式操作（如 updateState/clearState/traceControl） */
  onReady?: (layer: any) => void;
}

// SDK LayerNormalMgr 只派发 click/dblclick/rightclick/mousemove 四种
const LAYER_EVENTS: Array<{ sdk: string; prop: keyof LineLayerProps }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'dblclick', prop: 'onDblClick' },
  { sdk: 'rightclick', prop: 'onRightClick' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const LineLayer = defineComponent({
  name: 'LineLayer',
  props: {
    style: { type: Object as PropType<LineLayerStyle>, default: undefined },
    idKey: { type: String, default: undefined },
    crs: { type: String, default: undefined },
    isFlat: { type: Boolean, default: undefined },
    drawPart: { type: Boolean, default: undefined },
    selectedColor: { type: String, default: undefined },
    selectedIndex: { type: Number, default: undefined },
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
    isLinear: { type: Boolean, default: undefined },
    linearTexture: { default: undefined },
    nodeShow: { type: Boolean, default: undefined },
    nodeMask: { type: Boolean, default: undefined },
    nodeStrict: { type: Boolean, default: undefined },
    nodeJoin: { type: Boolean, default: undefined },
    nodeBreakpoint: { type: Boolean, default: undefined },
    nodeMiddleShow: { type: Boolean, default: undefined },
    nodeMinZoom: { type: Number, default: undefined },
    linkLine: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    data: { type: Object as PropType<object>, default: undefined },
    setDataParams: { type: Object as PropType<object>, default: undefined },
    onClick: { type: Function as PropType<(e: LineLayerEvent) => void>, default: undefined },
    onDblClick: { type: Function as PropType<(e: LineLayerEvent) => void>, default: undefined },
    onRightClick: { type: Function as PropType<(e: LineLayerEvent) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: LineLayerEvent) => void>, default: undefined },
    onReady: { type: Function as PropType<(layer: any) => void>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <LineLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    // ctorKey 含构造期选项 + style。SDK 的 setStyleOptions() 对线的描边/纹理等样式运行时改不生效，
    // 需重建图层，故把 style 纳入 ctorKey，任一样式字段变化即重建，保证及时生效。
    const ctorKey = computed(() => stableStringify([
      props.idKey, props.crs, props.isFlat, props.drawPart, props.selectedColor, props.selectedIndex,
      props.enablePicked, props.enableChangeSelectIndexByPick, props.autoSelect, props.popEvent,
      props.pickWidth, props.pickHeight, props.mouseStyleChange, props.isTop, props.isLowText,
      props.isLinear, props.linearTexture, props.nodeShow, props.nodeMask, props.nodeStrict,
      props.nodeJoin, props.nodeBreakpoint, props.nodeMiddleShow, props.nodeMinZoom, props.linkLine,
      props.style,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('style', props.style);
      put('idKey', props.idKey); put('crs', props.crs); put('isFlat', props.isFlat); put('drawPart', props.drawPart);
      put('selectedColor', props.selectedColor); put('selectedIndex', props.selectedIndex);
      put('enablePicked', props.enablePicked); put('enableChangeSelectIndexByPick', props.enableChangeSelectIndexByPick);
      put('autoSelect', props.autoSelect); put('popEvent', props.popEvent);
      put('pickWidth', props.pickWidth); put('pickHeight', props.pickHeight);
      put('mouseStyleChange', props.mouseStyleChange); put('referCenter', props.referCenter);
      put('isTop', props.isTop); put('isLowText', props.isLowText);
      put('isLinear', props.isLinear); put('linearTexture', props.linearTexture);
      put('nodeShow', props.nodeShow); put('nodeMask', props.nodeMask); put('nodeStrict', props.nodeStrict);
      put('nodeJoin', props.nodeJoin); put('nodeBreakpoint', props.nodeBreakpoint);
      put('nodeMiddleShow', props.nodeMiddleShow); put('nodeMinZoom', props.nodeMinZoom); put('linkLine', props.linkLine);
      // 受控字段的初始值也随构造传入（后续变化走 setter）
      put('visible', props.visible); put('opacity', props.opacity);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);

      const h = driver.createLineLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      // 绑定图层事件：调用时现读最新回调，随图层重建（ctorKey）重绑
      if (h.raw) {
        for (const { sdk, prop } of LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: LineLayerEvent) => void) | undefined;
            if (typeof fn === 'function') fn(e as LineLayerEvent);
          }));
        }
      }

      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data, props.setDataParams); } catch (e) { debugWarn('LineLayer.setData', e); }
      }

      // 暴露原生 layer 实例，供命令式调用（updateState/clearState/traceControl 等）
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

    // style 变化已并入 ctorKey（走重建）——SDK 对线样式不支持运行时 setStyleOptions 生效。

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
