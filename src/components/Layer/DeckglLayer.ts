/**
 * DeckglLayer —— deck.gl 接入图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.DeckglLayer。
 *
 * 用法：
 * ```vue
 * <DeckglLayer ref="deck" :data="{ layers: [new ScatterplotLayer({ id:'pts', data }) ] }" />
 * ```
 *
 * - deck.gl 由宿主工程自行引入并挂到全局 `window.deck`（@deck.gl/core 或 dist 全包），
 *   本组件不 import deck —— SDK 构造函数第一行就是 `if (!window.deck || !window.deck.Deck) throw`，
 *   异常被工厂吞掉后图层会静默变 null，所以组件在创建前先检查一次并打警告（见 ThreeLayer 的守卫写法）。
 * - `data`：deck props 对象（开放集合，最常用 `{ layers: [...] }`），变化时调 raw.setProps()，
 *   不重建 Deck 实例；静态的 deck 配置（views / effects / controller 等）也可作为未声明的
 *   attr 透传给 Deck 构造器（`inheritAttrs: false` + attrs 收集，kebab → camel，与
 *   createLayerComponent 同款）。
 * - 其余构造项（animation / renderStage / minZoom / maxZoom / referCenter / 透传 attrs）变化 → 重建图层。
 *   `visible` / `opacity` / `zIndex` 走运行时 setter，不重建。
 * - ⚠️ deck.gl 8.x 限制：同一共享 GL 上下文上，Deck 被 finalize 后无法安全重新初始化
 *   （会报 "deck.gl: assertion failed" + "no ARRAY_BUFFER is bound"）。因此**显示/隐藏请用
 *   `:visible` 而不是 v-if 卸载/重挂**；同一 `<Map>` 内也不要在运行时反复销毁重建本组件。
 * - SDK 不派发 ready / render / destroy / error 事件，生命周期走构造参数回调
 *   （onInit(deck, layer) / onError(err) / onDestroy(deck, layer)）；回调用固定 wrapper
 *   现读最新 prop，改回调不重建图层。
 * - 命令式句柄（`ref`）：setProps() / getDeck() / getStatus() / getTime() /
 *   startAnimation() / stopAnimation() / isAnimating()，方法名对齐 JSAPI DeckglLayer。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface DeckglLayerOptions {
  /** 是否逐帧重绘（deck 动画 / 动态数据用），默认 false */
  animation?: boolean;
  /** 渲染阶段：'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi'，默认 'tilelayer' */
  renderStage?: 'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi';
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  minZoom?: number;
  maxZoom?: number;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface DeckglLayerProps extends DeckglLayerOptions {
  /**
   * deck props 对象（开放集合），最常用 `{ layers: [...] }`；变化时调用 raw.setProps()，
   * 不重建 Deck。静态 deck 配置（views / effects / controller / useDevicePixels 等）
   * 也可作为未声明的 attr 透传给 Deck 构造器。
   */
  data?: Record<string, unknown>;
  /** GL 就绪、Deck 实例创建完成后调用，参数 (deck, layer) —— layer 与 ref 拿到的是同一个句柄 */
  onInit?: (deck: unknown, layer: DeckglLayerRef) => void;
  /** 渲染 / 创建出错时回调，err = { type, message, layer } */
  onError?: (err: unknown) => void;
  /** 图层销毁前回调，参数 (deck, layer) */
  onDestroy?: (deck: unknown, layer: DeckglLayerRef) => void;
}

/** 命令式句柄（组件 expose 同名对象，`ref` 取用），方法名对齐 JSAPI DeckglLayer。 */
export interface DeckglLayerRef {
  /** 更新 deck props（如 layers）；等价于把新值放进 `data` prop 触发 setProps */
  setProps: (props: Record<string, unknown>) => void;
  /** 内部 Deck 实例；GL 就绪（onInit 触发）前为 null */
  getDeck: () => unknown;
  /** 'pending'（Deck 还没建好）| 'ready' | 'error' */
  getStatus: () => string;
  /** 图层加入地图起算的秒数，做动画用 */
  getTime: () => number;
  startAnimation: () => void;
  stopAnimation: () => void;
  isAnimating: () => boolean;
}

/** window.deck 缺失只提醒一次，避免每次重渲染都刷屏 */
let warnedMissingDeck = false;
function warnMissingDeck(): void {
  if (warnedMissingDeck) return;
  warnedMissingDeck = true;
  try {
    if (typeof console === 'undefined') return;
    console.warn(
      '[vue-bmap] <DeckglLayer> 需要宿主工程自行引入 deck.gl 并挂到 window.deck 上（如 @deck.gl/core），' +
        '当前未检测到 window.deck.Deck，图层已跳过创建。异步加载 deck.gl 时，请等就绪后再渲染 <DeckglLayer>。',
    );
  } catch { /* 日志不能反过来把调用方搞崩 */ }
}

export const DeckglLayer = defineComponent({
  name: 'DeckglLayer',
  // deck 的 props 是开放集合：未声明的 attr 走 attrs 收集透传给 Deck 构造器（kebab → camel）
  inheritAttrs: false,
  props: {
    data: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    animation: { type: Boolean, default: undefined },
    renderStage: { type: String as PropType<DeckglLayerOptions['renderStage']>, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    referCenter: { default: undefined },
    onInit: { type: Function as PropType<DeckglLayerProps['onInit']>, default: undefined },
    onError: { type: Function as PropType<DeckglLayerProps['onError']>, default: undefined },
    onDestroy: { type: Function as PropType<DeckglLayerProps['onDestroy']>, default: undefined },
  },
  setup(props: any, { attrs, expose }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <DeckglLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    const rawOf = () => (handle ? (handle as { raw: unknown }).raw as any : null);
    /** 命令式句柄：句柄本身稳定，方法体内现读原生实例（GL 就绪前为 no-op） */
    const refHandle: DeckglLayerRef = {
      setProps: (p) => { try { rawOf()?.setProps?.(p); } catch { /* ignore */ } },
      getDeck: () => { try { return rawOf()?.getDeck?.() ?? null; } catch { return null; } },
      getStatus: () => { try { return rawOf()?.getStatus?.() ?? 'pending'; } catch { return 'pending'; } },
      getTime: () => { try { return rawOf()?.getTime?.() ?? 0; } catch { return 0; } },
      startAnimation: () => { try { rawOf()?.startAnimation?.(); } catch { /* ignore */ } },
      stopAnimation: () => { try { rawOf()?.stopAnimation?.(); } catch { /* ignore */ } },
      isAnimating: () => { try { return !!rawOf()?.isAnimating?.(); } catch { return false; } },
    };
    expose(refHandle);

    /** 透传 attrs：未声明的 deck props（layers / views / effects / controller / onViewStateChange …），kebab → camel */
    const passthrough = (): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        const key = k.includes('-') ? k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase()) : k;
        out[key] = v;
      }
      return out;
    };

    const ctorKey = computed(() => stableStringify([
      props.animation, props.renderStage,
      // visible / opacity / zIndex 走运行时 setter，不进 ctorKey——
      // 尤其 visible：deck 8.x 在 finalize 后无法安全重建共享 GL 上下文，显示/隐藏必须避免重建
      props.minZoom, props.maxZoom,
      props.referCenter, passthrough(),
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      // 外部依赖守卫：deck 由宿主挂全局 window.deck，组件不引入
      if (!(globalThis as { deck?: { Deck?: unknown } }).deck?.Deck) {
        warnMissingDeck();
        return;
      }
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('animation', props.animation); put('renderStage', props.renderStage);
      put('visible', props.visible); put('opacity', props.opacity); put('zIndex', props.zIndex);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('referCenter', props.referCenter);

      // 固定 wrapper + 现读最新回调：SDK 回调签名 onInit(deck, layer) / onError(err) / onDestroy(deck, layer)
      opts.onInit = (deck: unknown) => {
        const fn = props.onInit as DeckglLayerProps['onInit'] | undefined;
        if (typeof fn === 'function') fn(deck, refHandle);
      };
      opts.onError = (err: unknown) => {
        const fn = props.onError as DeckglLayerProps['onError'] | undefined;
        if (typeof fn === 'function') fn(err);
      };
      opts.onDestroy = (deck: unknown) => {
        const fn = props.onDestroy as DeckglLayerProps['onDestroy'] | undefined;
        if (typeof fn === 'function') fn(deck, refHandle);
      };
      Object.assign(opts, passthrough());

      const h = driver.createDeckglLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (props.data && h.raw) {
        try { (h.raw as any).setProps?.(props.data); } catch (e) { debugWarn('DeckglLayer.setProps', e); }
      }
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // 运行时 setter：显示/透明度/层级变化不重建图层
    watch(() => props.visible, (v) => {
      if (v === undefined) return;
      const raw = handle?.raw as { setVisible?: (v: boolean) => void } | undefined;
      try { raw?.setVisible?.(v); } catch { /* ignore */ }
    });
    watch(() => props.opacity, (v) => {
      if (v === undefined) return;
      const raw = handle?.raw as { setOpacity?: (v: number) => void } | undefined;
      try { raw?.setOpacity?.(v); } catch { /* ignore */ }
    });
    watch(() => props.zIndex, (v) => {
      if (v === undefined) return;
      const raw = handle?.raw as { setZIndex?: (v: number) => void } | undefined;
      try { raw?.setZIndex?.(v); } catch { /* ignore */ }
    });

    // deck props 是开放集合（layers 里是 Layer 实例，含函数/内部状态），不能用 stableStringify 做键——
    // 不同实例可能序列化结果相同，导致 setProps 不触发。按引用监听：每次给新的 props 对象就下发，
    // 浅层是否变化交给 deck 自己的 diff。
    watch(() => props.data, (d) => {
      if (!handle?.raw || !d) return;
      try { (handle.raw as any).setProps?.(d); } catch { /* noop */ }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
