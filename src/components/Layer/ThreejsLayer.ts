/**
 * ThreejsLayer —— three.js 接入图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.ThreejsLayer。
 *
 * 用法：
 * ```vue
 * <ThreejsLayer ref="t" :on-init="(ctx) => {
 *   const mesh = new THREE.Mesh(new THREE.BoxGeometry(500,500,500), new THREE.MeshBasicMaterial({ color: 0x1890ff }));
 *   const [x, y] = ctx.projectToLayer(center);
 *   mesh.position.set(x, y, 250);
 *   ctx.layer.add(mesh);
 * }" />
 * ```
 *
 * - three.js 由宿主工程自行引入并挂到全局 `window.THREE`，本组件不 import three —— SDK
 *   构造函数第一行就是 `if (!window.THREE) throw`，异常被工厂吞掉后图层会静默变 null，
 *   所以组件在创建前先检查一次并打警告（守卫写法与 ThreeLayer 一致）。
 * - 生命周期回调（onInit / preRender / onRender / afterRender / onDestroy / onError）走
 *   构造参数，SDK 以 `hook.call(this, ctx)` 调用，`ctx = { layer, map, renderer, scene,
 *   camera, projectToLayer, getTime, getUnitsPerPixel }`。回调用固定 wrapper 现读最新 prop，
 *   改回调不重建图层；`onRender` 一旦提供会**接管**渲染（SDK if/else：默认
 *   renderer.render(scene, camera) 不再执行），运行期撤掉时兜底回默认渲染。
 * - 重建仅发生在 alpha / antialias / animation / minZoom / maxZoom / 是否接了 onRender；
 *   visible / opacity / zIndex / renderStage / referCenter 走 SDK setter（WebGLLayer 基类），
 *   改它们不会销毁重建 three.js 场景。
 * - 命令式句柄（`ref`）：add() / removeObject() / getScene() / getCamera() / getRenderer() /
 *   getStatus() / getTime() / projectToLayer() / startAnimation() / stopAnimation() /
 *   isAnimating()，方法名对齐 JSAPI ThreejsLayer（注意移除单个对象是 removeObject，
 *   与移除整个图层的 remove() 不是一回事）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { tryGetSDK } from '../../utils/sdk';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle, Point } from '../../types';

/** three.js 的对象（Scene / Camera / WebGLRenderer / Object3D 等）。本库不依赖 three，交由宿主自行断言。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreeObject = any;

/**
 * 生命周期回调的上下文（SDK `_context()` 的产物）。SDK 以 `hook.call(this, ctx)` 调用，
 * 回调里的 `this` 是 SDK 图层实例；`ctx.layer` 是同一实例（可直接 add / removeObject）。
 */
export interface ThreejsLayerContext {
  /** SDK 图层实例（方法对齐 BMap.ThreejsLayer：add / removeObject / projectToLayer …） */
  layer: unknown;
  map: unknown;
  renderer: ThreeObject;
  scene: ThreeObject;
  camera: ThreeObject;
  /** 经纬度 → 图层局部坐标（相对 referCenter 的墨卡托米），与 WebGLCustomLayer 同口径 */
  projectToLayer: (lngLat: unknown) => unknown;
  /** 图层加入地图起算的秒数 */
  getTime: () => number;
  /** 当前缩放级别的单位像素 */
  getUnitsPerPixel: () => number;
}

export type ThreejsLayerHook = (ctx: ThreejsLayerContext) => void;

export interface ThreejsLayerOptions {
  /** 传给 THREE.WebGLRenderer 的 alpha，默认 true。变化会重建图层。 */
  alpha?: boolean;
  /** 传给 THREE.WebGLRenderer 的 antialias，默认 false。变化会重建图层。 */
  antialias?: boolean;
  /** 是否逐帧重绘（three 场景动画用），默认 false */
  animation?: boolean;
  /** 渲染阶段：'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi'，默认 'tilelayer' */
  renderStage?: 'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi';
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  minZoom?: number;
  maxZoom?: number;
  /** 参考中心点（SDK 要求 instanceof Point）。世界坐标相对该点偏移，一般不用给 */
  referCenter?: Point;
}

export interface ThreejsLayerProps extends ThreejsLayerOptions {
  /** GL 就绪、renderer/scene/camera 创建完成后调用（ctx.projectToLayer 此时可用） */
  onInit?: ThreejsLayerHook;
  /** 每帧渲染前 */
  preRender?: ThreejsLayerHook;
  /**
   * 接管渲染。SDK 里这是 if/else：接了它就**不再**执行默认的
   * renderer.render(scene, camera)，必须自己渲染。变化会重建图层。
   */
  onRender?: ThreejsLayerHook;
  /** 每帧渲染后 */
  afterRender?: ThreejsLayerHook;
  /** 图层销毁前。SDK 随后会 dispose 场景与渲染器 */
  onDestroy?: ThreejsLayerHook;
  /** 渲染 / 创建出错时回调，err = { type, message, layer } */
  onError?: (err: unknown) => void;
}

/** 命令式句柄（组件 expose 同名对象，`ref` 取用），方法名对齐 JSAPI ThreejsLayer。 */
export interface ThreejsLayerRef {
  /** 把对象加入场景（GL 未就绪时 SDK 先攒着，就绪后自动补进去） */
  add: (object: ThreeObject) => void;
  /** 从场景移除对象。注意不是移除整个图层的 remove() */
  removeObject: (object: ThreeObject) => void;
  getScene: () => ThreeObject;
  getCamera: () => ThreeObject;
  getRenderer: () => ThreeObject;
  /** 'pending'（renderer 还没建好）| 'ready' | 'error' */
  getStatus: () => string;
  /** 图层加入地图起算的秒数 */
  getTime: () => number;
  /** 经纬度 → 图层局部坐标（相对 referCenter 的墨卡托米，即 three 场景里的 x/y） */
  projectToLayer: (lngLat: unknown) => unknown;
  startAnimation: () => void;
  stopAnimation: () => void;
  isAnimating: () => boolean;
}

/** window.THREE 缺失只提醒一次，避免每次重渲染都刷屏 */
let warnedMissingThree = false;
function warnMissingThree(): void {
  if (warnedMissingThree) return;
  warnedMissingThree = true;
  try {
    if (typeof console === 'undefined') return;
    console.warn(
      '[vue-bmap] <ThreejsLayer> 需要宿主工程自行引入 three.js 并挂到 window.THREE 上，' +
        '当前未检测到，图层已跳过创建。异步加载 three.js 时，请等就绪后再渲染 <ThreejsLayer>。',
    );
  } catch { /* 日志不能反过来把调用方搞崩 */ }
}

/** referCenter：SDK 的 _getBaseMC 直接 crsLL2MC(center)，要求真实 Point */
function toSDKPoint(point: Point): unknown {
  const SDK = tryGetSDK();
  return SDK ? new SDK.Point(point.lng, point.lat) : undefined;
}

export const ThreejsLayer = defineComponent({
  name: 'ThreejsLayer',
  props: {
    alpha: { type: Boolean, default: undefined },
    antialias: { type: Boolean, default: undefined },
    animation: { type: Boolean, default: undefined },
    renderStage: { type: String as PropType<ThreejsLayerOptions['renderStage']>, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    referCenter: { type: Object as PropType<Point>, default: undefined },
    onInit: { type: Function as PropType<ThreejsLayerHook>, default: undefined },
    preRender: { type: Function as PropType<ThreejsLayerHook>, default: undefined },
    onRender: { type: Function as PropType<ThreejsLayerHook>, default: undefined },
    afterRender: { type: Function as PropType<ThreejsLayerHook>, default: undefined },
    onDestroy: { type: Function as PropType<ThreejsLayerHook>, default: undefined },
    onError: { type: Function as PropType<(err: unknown) => void>, default: undefined },
  },
  setup(props: any, { expose }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <ThreejsLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    const rawOf = () => (handle ? (handle as { raw: unknown }).raw as any : null);
    /** 命令式句柄：句柄本身稳定，方法体内现读原生实例（GL 就绪前为 no-op） */
    const refHandle: ThreejsLayerRef = {
      add: (o) => { try { rawOf()?.add?.(o); } catch { /* ignore */ } },
      removeObject: (o) => { try { rawOf()?.removeObject?.(o); } catch { /* ignore */ } },
      getScene: () => { try { return rawOf()?.getScene?.() ?? null; } catch { return null; } },
      getCamera: () => { try { return rawOf()?.getCamera?.() ?? null; } catch { return null; } },
      getRenderer: () => { try { return rawOf()?.getRenderer?.() ?? null; } catch { return null; } },
      getStatus: () => { try { return rawOf()?.getStatus?.() ?? 'pending'; } catch { return 'pending'; } },
      getTime: () => { try { return rawOf()?.getTime?.() ?? 0; } catch { return 0; } },
      projectToLayer: (lngLat) => { try { return rawOf()?.projectToLayer?.(lngLat) ?? lngLat; } catch { return lngLat; } },
      startAnimation: () => { try { rawOf()?.startAnimation?.(); } catch { /* ignore */ } },
      stopAnimation: () => { try { rawOf()?.stopAnimation?.(); } catch { /* ignore */ } },
      isAnimating: () => { try { return !!rawOf()?.isAnimating?.(); } catch { return false; } },
    };
    expose(refHandle);

    // 重建触发项：alpha / antialias / animation / minZoom / maxZoom / 是否接了 onRender。
    // minZoom/maxZoom 无 setter（WebGLLayer 基类没有），其余走 setter 不重建，保住 three 场景。
    const ctorKey = computed(() => stableStringify([
      props.alpha, props.antialias, props.animation,
      props.minZoom, props.maxZoom, !!props.onRender,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      // 外部依赖守卫：three.js 由宿主挂全局 window.THREE，组件不引入
      if (!(globalThis as { THREE?: unknown }).THREE) {
        warnMissingThree();
        return;
      }
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('alpha', props.alpha); put('antialias', props.antialias); put('animation', props.animation);
      put('renderStage', props.renderStage);
      put('visible', props.visible); put('opacity', props.opacity); put('zIndex', props.zIndex);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom);
      if (props.referCenter !== undefined) opts.referCenter = toSDKPoint(props.referCenter);

      // 固定 wrapper + 现读最新回调：SDK 以 hook.call(this, ctx) 调用
      const hook = (get: () => ThreejsLayerHook | undefined) =>
        function (ctxArg: ThreejsLayerContext) { get()?.(ctxArg); };
      opts.onInit = hook(() => props.onInit);
      opts.preRender = hook(() => props.preRender);
      opts.afterRender = hook(() => props.afterRender);
      opts.onDestroy = hook(() => props.onDestroy);
      opts.onError = (err: unknown) => {
        const fn = props.onError as ((err: unknown) => void) | undefined;
        if (typeof fn === 'function') fn(err);
      };
      // 只有真的传了 onRender 才挂进 options：SDK 是
      // `this.options.onRender ? 自定义 : renderer.render(scene, camera)`，
      // 无条件挂 wrapper 会把默认渲染整个关掉 → 画面全空
      if (props.onRender) {
        opts.onRender = function (ctxArg: ThreejsLayerContext) {
          const fn = props.onRender as ThreejsLayerHook | undefined;
          // 运行期把 onRender 撤成 undefined 时兜底走默认渲染，否则画面会停住
          if (fn) fn(ctxArg);
          else ctxArg.renderer.render(ctxArg.scene, ctxArg.camera);
        };
      }

      const h = driver.createThreejsLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // 公共项走 SDK setter（WebGLLayer 基类），改它们不重建 three 场景
    watch(() => props.visible, (v) => {
      if (!handle?.raw || v === undefined) return;
      try { (handle.raw as any).setVisible?.(v); } catch (e) { debugWarn('ThreejsLayer.setVisible', e); }
    });
    watch(() => props.opacity, (v) => {
      if (!handle?.raw || v === undefined) return;
      try { (handle.raw as any).setOpacity?.(v); } catch (e) { debugWarn('ThreejsLayer.setOpacity', e); }
    });
    watch(() => props.zIndex, (v) => {
      if (!handle?.raw || v === undefined) return;
      try { (handle.raw as any).setZIndex?.(v); } catch (e) { debugWarn('ThreejsLayer.setZIndex', e); }
    });
    watch(() => props.renderStage, (v) => {
      if (!handle?.raw || v === undefined) return;
      try { (handle.raw as any).setRenderStage?.(v); } catch (e) { debugWarn('ThreejsLayer.setRenderStage', e); }
    });
    watch(() => [props.referCenter?.lng, props.referCenter?.lat], () => {
      if (!handle?.raw || props.referCenter === undefined) return;
      const pt = toSDKPoint(props.referCenter);
      if (!pt) return;
      try { (handle.raw as any).setRefCenter?.(pt); } catch (e) { debugWarn('ThreejsLayer.setRefCenter', e); }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
