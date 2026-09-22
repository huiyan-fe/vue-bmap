/**
 * CustomOverlay —— slot 内容渲染成自定义 DOM 覆盖物。
 * 对应 react-bmap 的 components/Overlay/CustomOverlay.tsx（React 用 createPortal，这里用 <Teleport>）。
 *
 * SDK 仍需要一个 domCreate 函数，公共 API 通过默认插槽把内容渲染进该 DOM 节点。
 * 与 CustomControl 的本质区别：CustomOverlay 绑定地理坐标（point），会随地图移动。
 */
import {
  Teleport, defineComponent, h, inject, onMounted, onUnmounted, watch, type PropType,
} from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import type { OverlayHandle, Point } from '../../types';

export interface CustomOverlayProps {
  /** 地理坐标点 */
  point?: Point;
  /** 锚点 [x, y]，左上角 [0,0]，取值 [0,1] @default [0.5, 1] */
  anchors?: [number, number];
  /** X 轴偏移（px） */
  offsetX?: number;
  /** Y 轴偏移（px） */
  offsetY?: number;
  /** 旋转角度（度） */
  rotation?: number;
  /** 初始旋转基准角度 */
  rotationInit?: number;
  /** 最小缩放级别 */
  minZoom?: number;
  /** 最大缩放级别 */
  maxZoom?: number;
  /** 自定义业务属性 */
  properties?: unknown;
  /** DOM 固定在底部 */
  fixBottom?: boolean;
  /** 使用 translate3d 性能优化 */
  useTranslate?: boolean;
  /** 随地图旋转 */
  autoFollowHeadingChanged?: boolean;
  /** 层叠顺序 */
  zIndex?: number;
  /** 是否在 map.clearOverlays() 时清除 */
  enableMassClear?: boolean;
  /** 覆盖物上是否允许拖拽地图 */
  enableDraggingMap?: boolean;
  /** 控制显示/隐藏。undefined 或 true = 显示，false = 隐藏 */
  visible?: boolean;
  onClick?: (point: Point, raw: unknown) => void;
  onMouseOver?: (point: Point, raw: unknown) => void;
  onMouseOut?: (point: Point, raw: unknown) => void;
}

/** 可通过 setOverlayOptions 更新的 option prop */
const OPTION_PROPS = ['point', 'rotation', 'properties'] as const;
/** 只能构造时设置、变化需重建的 prop */
const CTOR_ONLY_PROPS = [
  'anchors', 'offsetX', 'offsetY', 'minZoom', 'maxZoom', 'fixBottom',
  'useTranslate', 'autoFollowHeadingChanged', 'enableDraggingMap',
  'rotationInit', 'zIndex', 'enableMassClear',
] as const;
const SDK_PROPS = [...OPTION_PROPS, ...CTOR_ONLY_PROPS] as const;
const EVENTS: Array<{ sdk: string; prop: 'onClick' | 'onMouseOver' | 'onMouseOut' }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
];

export const CustomOverlay = defineComponent({
  name: 'CustomOverlay',
  props: {
    point: { type: Object as PropType<Point>, default: undefined },
    anchors: { type: Array as unknown as PropType<[number, number]>, default: undefined },
    offsetX: { type: Number, default: undefined },
    offsetY: { type: Number, default: undefined },
    rotation: { type: Number, default: undefined },
    rotationInit: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    properties: { default: undefined },
    fixBottom: { type: Boolean, default: undefined },
    useTranslate: { type: Boolean, default: undefined },
    autoFollowHeadingChanged: { type: Boolean, default: undefined },
    zIndex: { type: Number, default: undefined },
    enableMassClear: { type: Boolean, default: undefined },
    enableDraggingMap: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    onClick: { type: Function as PropType<(point: Point, raw: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(point: Point, raw: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(point: Point, raw: unknown) => void>, default: undefined },
  },
  setup(props, { slots }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <CustomOverlay> 必须用在 <Map> 内部');
    const target = inject(OVERLAY_TARGET_KEY, null);

    const p = props as unknown as Record<string, unknown>;
    const container = typeof document !== 'undefined' ? document.createElement('div') : null;

    let overlay: OverlayHandle | null = null;
    let unsubs: Array<() => void> = [];

    const pickDefined = (keys: ReadonlyArray<string>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of keys) {
        const v = p[k];
        if (v !== undefined && v !== null) out[k] = v;
      }
      return out;
    };

    const bindEvents = () => {
      const ctx = mapCtx.value;
      if (!overlay || !ctx) return;
      for (const { sdk, prop } of EVENTS) {
        unsubs.push(ctx.driver.addEventListener(overlay, sdk, (raw: any) => {
          const fn = props[prop];
          if (typeof fn === 'function') fn(raw?.point ?? raw?.latlng ?? raw?.latLng ?? raw, raw);
        }));
      }
    };

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !container) return;
      const el = container;
      const h0 = ctx.driver.createCustomOverlay(() => el, pickDefined(SDK_PROPS));
      if (!h0) return;
      overlay = h0;
      if (target?.addOverlay) target.addOverlay(h0);
      else ctx.driver.addOverlay(ctx.map, h0);

      const initOpts = pickDefined(OPTION_PROPS);
      if (Object.keys(initOpts).length > 0) ctx.driver.setOverlayOptions(h0, initOpts);
      if (props.visible === false) ctx.driver.hideOverlay(h0);
      bindEvents();
    };

    const destroy = () => {
      unsubs.forEach((u) => u());
      unsubs = [];
      const ctx = mapCtx.value;
      if (overlay) {
        try {
          if (target?.removeOverlay) target.removeOverlay(overlay);
          else if (ctx?.map) ctx.driver.removeOverlay(ctx.map, overlay);
        } catch { /* ignore */ }
      }
      overlay = null;
    };

    // map / 父级 target / ctor prop 变化 → 重建。
    // 注意：不用 immediate —— immediate 会在 setup 阶段（Teleport 尚未把 slot 内容放进 container 前）
    // 就创建覆盖物，SDK 按“空容器”尺寸定位，等内容渲染后尺寸变化，锚点就偏了，表现为“进页面挪位置”。
    // 首次创建改到 onMounted（此时 slot 内容已 teleport 进 container，尺寸正确），
    // 与 react 用 createPortal + useLayoutEffect 的时序一致。
    watch(
      [() => mapCtx.value?.map, () => target?.handle.value, () => stableStringify(CTOR_ONLY_PROPS.map((k) => p[k]))],
      () => { destroy(); create(); },
    );
    onMounted(() => { if (!overlay) create(); });
    // option prop 变化 → setOverlayOptions
    watch(() => stableStringify(pickDefined(OPTION_PROPS)), () => {
      const ctx = mapCtx.value;
      if (!overlay || !ctx?.driver) return;
      const snap = pickDefined(OPTION_PROPS);
      if (Object.keys(snap).length > 0) ctx.driver.setOverlayOptions(overlay, snap);
    });
    // 可见性
    watch(() => props.visible, (v) => {
      const ctx = mapCtx.value;
      if (!overlay || !ctx?.driver) return;
      if (v === false) ctx.driver.hideOverlay(overlay);
      else ctx.driver.showOverlay(overlay);
    });

    onUnmounted(destroy);

    return () => (container ? h(Teleport, { to: container }, slots.default ? slots.default() : []) : null);
  },
});
