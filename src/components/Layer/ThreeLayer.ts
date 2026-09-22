/**
 * ThreeLayer —— three.js 图层（手写组件，继承 NormalLayer；带命令式句柄，用 defineExpose 暴露）。
 * @since 4.0  对应 react-bmap 的 Layer/ThreeLayer.tsx（forwardRef → defineExpose）。
 *
 * 组件方式：
 * ```vue
 * <ThreeLayer ref="layerRef" antialias :z-index="5"
 *   :on-init="(renderer, scene, camera, layer) => {
 *     const mesh = new THREE.Mesh(new THREE.BoxGeometry(500,500,500), new THREE.MeshBasicMaterial({ color: 0x1890ff }));
 *     const [x, y] = layer.toWorld(center)!;
 *     mesh.position.set(x, y, 250);
 *     layer.add(mesh);
 *     layer.triggerRepaint();  // 不调这一下 animate() 直接 return，画面不会更新
 *   }" />
 * ```
 * 通过模板 ref 拿到 ThreeLayerRef（layerRef.value）做命令式操作。
 *
 * 实现要点（与 react 对齐）：
 * - three.js 由宿主工程自行引入且必须挂在 window.THREE 上：SDK 构造函数第一行就
 *   `if (!window.THREE) throw`，异常被工厂吞掉后图层静默变成 null。缺失时打一次警告。
 * - ctorKey 只含 alpha / antialias / 是否接了 onRender：三者只能重建；其余参数走
 *   NormalLayer 的 setter，改一个 zIndex 不会把用户的 three.js 场景销毁重建。
 * - 生命周期回调传固定 wrapper（普通函数，SDK 用 hook.bind(this) 调用），内部现读最新
 *   回调（Vue props 响应式）；同时把命令式句柄作为第 4 个参数传出去，箭头函数也能拿到。
 * - opacity 对本图层无效，见 ThreeLayerOptions.opacity 的说明。
 */
import { defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { debugWarn, devWarn } from '../../utils/debugWarn';
import { tryGetSDK } from '../../utils/sdk';
import type { LayerHandle, MapHandle, Point } from '../../types';

/**
 * three.js 的对象（Scene / Camera / WebGLRenderer / Object3D 等）。
 * 本库不依赖 three，也不想把 three 的类型塞进公共 API，交由宿主自行断言。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreeObject = any;

/** SDK ThreeLayer 实例上实际存在的成员（取自 v4 bundle） */
export interface ThreeLayerInstance {
  scene?: ThreeObject;
  camera?: ThreeObject;
  renderer?: ThreeObject;
  map?: ThreeObject;
  add(object: ThreeObject): void;
  remove(object: ThreeObject): void;
  getScene(): ThreeObject;
  getCamera(): ThreeObject;
  getRender(): ThreeObject;
  getMap(): ThreeObject | null;
  triggerRepaint(): void;
  triggerStop(): void;
  refreshMap(): void;
  pick(x: number, y: number): ThreeObject[] | null;
}

/**
 * 生命周期回调。
 *
 * SDK 用 `hook.bind(this)(renderer, scene, camera)` 调用，所以普通函数里的 `this` 是 SDK 图层实例；
 * 第 4 个参数 `layer` 是组件对外的命令式句柄（与 ref 拿到的是同一个对象），箭头函数用它。
 */
export type ThreeLayerHook = (
  this: ThreeLayerInstance,
  renderer: ThreeObject,
  scene: ThreeObject,
  camera: ThreeObject,
  layer: ThreeLayerRef,
) => void;

/** 命令式句柄。图层实例要等 GL 就绪才有，所以句柄本身始终存在，成员在就绪前为 null / no-op。 */
export interface ThreeLayerRef {
  /** SDK 图层实例；GL 就绪（onInit 触发）前为 null */
  readonly raw: ThreeLayerInstance | null;
  readonly scene: ThreeObject | null;
  readonly camera: ThreeObject | null;
  readonly renderer: ThreeObject | null;
  add(object: ThreeObject): void;
  remove(object: ThreeObject): void;
  triggerRepaint(): void;
  triggerStop(): void;
  refreshMap(): void;
  pick(x: number, y: number): ThreeObject[] | null;
  /**
   * 经纬度 → three.js 世界坐标（相对固定墨卡托基准点的偏移，单位约等于米）。
   *
   * 走 map.toFormatCoords，而不是实例上的 convertLngLat —— 后者在 v4 里是坏的：
   * 它把 `map.toFormatCoords`（一个函数）当成带 setCenter 的对象用，一调就 TypeError。
   */
  toWorld(point: Point): [number, number] | null;
}

export interface ThreeLayerOptions {
  /** 传给 THREE.WebGLRenderer 的 alpha，默认 false。变化会重建图层。 */
  alpha?: boolean;
  /** 传给 THREE.WebGLRenderer 的 antialias，默认 false。变化会重建图层。 */
  antialias?: boolean;
  /** 是否显示，默认 true */
  visible?: boolean;
  /** 最小显示级别，默认 3 */
  minZoom?: number;
  /** 最大显示级别，默认 21 */
  maxZoom?: number;
  /** 层级，默认 1 */
  zIndex?: number;
  /**
   * 参考中心点。只会写到实例的 this.center，而 v4 的 ThreeLayer.render 取的矩阵
   * （_updatePolyLayerMatrix）并不带它 —— 世界坐标只能相对默认墨卡托基准点，
   * 传了反而对不上，一般不用给。
   */
  referCenter?: Point;
  /**
   * @deprecated 对 ThreeLayer 无效。NormalLayer 构造函数会存 this.opacity、也提供
   * setOpacity/getOpacity，但 ThreeLayer.render 只做 renderer.render(scene, camera)，
   * 整块原型里从不读它。three.js 的透明度请设在材质上
   * （material.transparent = true 且 material.opacity = x）。
   */
  opacity?: number;
}

export interface ThreeLayerProps extends ThreeLayerOptions {
  /** GL 就绪、场景/相机/渲染器创建完成后调用，在这里往场景里加物体 */
  onInit?: ThreeLayerHook;
  /**
   * 接管渲染。SDK 里这是 if/else：接了它就**不再**调用默认的
   * renderer.render(scene, camera)，必须自己渲染。变化会重建图层。
   */
  onRender?: ThreeLayerHook;
  /** 每帧渲染前 */
  preRender?: ThreeLayerHook;
  /** 每帧渲染后 */
  afterRender?: ThreeLayerHook;
  /** 图层销毁前。SDK 随后会 dispose 场景与渲染器，场景里的物体不需要自己清 */
  onDestroy?: ThreeLayerHook;
  /** 因 visible / 缩放级别超出 [minZoom, maxZoom] 而隐藏时 */
  onHide?: ThreeLayerHook;
  /** 从隐藏恢复显示时 */
  onShow?: ThreeLayerHook;
}

/** window.THREE 缺失只提醒一次，避免每次重渲染都刷屏 */
let warnedMissingThree = false;
function warnMissingThree(): void {
  if (warnedMissingThree) return;
  warnedMissingThree = true;
  try {
    if (typeof console === 'undefined') return;
    // 这条不走 devWarn：生产环境同样是「图层静默消失」，必须能看见
    console.warn(
      '[vue-bmap] <ThreeLayer> 需要宿主工程自行引入 three.js 并挂到 window.THREE 上，' +
        '当前未检测到，图层已跳过创建。异步加载 three.js 时，请等就绪后再渲染 <ThreeLayer>。',
    );
  } catch { /* 日志不能反过来把调用方搞崩 */ }
}

/** referCenter：SDK 的 setRefCenter 要求 instanceof Point，普通对象会被静默忽略 */
function toSDKPoint(point: Point): unknown {
  const SDK = tryGetSDK();
  return SDK ? new SDK.Point(point.lng, point.lat) : undefined;
}

export const ThreeLayer = defineComponent({
  name: 'ThreeLayer',
  props: {
    alpha: { type: Boolean, default: undefined },
    antialias: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    referCenter: { type: Object as PropType<Point>, default: undefined },
    opacity: { type: Number, default: undefined },
    onInit: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    onRender: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    preRender: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    afterRender: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    onDestroy: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    onHide: { type: Function as PropType<ThreeLayerHook>, default: undefined },
    onShow: { type: Function as PropType<ThreeLayerHook>, default: undefined },
  },
  setup(props, { expose }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <ThreeLayer> 必须用在 <Map> 内部');

    // SDK 图层实例：等 onAdd（GL 就绪）才有
    let rawInstance: ThreeLayerInstance | null = null;
    let layerHandle: LayerHandle | null = null;
    let warnedOpacity = false;

    // 命令式句柄：句柄本身稳定，方法体内现读 rawInstance
    const handle: ThreeLayerRef = {
      get raw() { return rawInstance ?? null; },
      get scene() { return rawInstance?.scene ?? null; },
      get camera() { return rawInstance?.camera ?? null; },
      get renderer() { return rawInstance?.renderer ?? null; },
      add(object) { rawInstance?.add(object); },
      remove(object) { rawInstance?.remove(object); },
      triggerRepaint() { rawInstance?.triggerRepaint(); },
      triggerStop() { rawInstance?.triggerStop(); },
      refreshMap() { rawInstance?.refreshMap(); },
      pick(x, y) { return rawInstance?.pick(x, y) ?? null; },
      toWorld(point) {
        const rawMap = rawInstance?.map ?? (mapCtx.value?.map as MapHandle | null)?.raw;
        if (!(rawMap as any)?.toFormatCoords) return null;
        try {
          const [pair] = (rawMap as any).toFormatCoords([[point.lng, point.lat]]);
          return [pair[0], pair[1]];
        } catch (e) {
          debugWarn('ThreeLayer.toWorld', e);
          return null;
        }
      },
    };

    expose(handle);

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(globalThis as any).THREE) {
        warnMissingThree();
        return;
      }

      const opts: Record<string, unknown> = {};
      if (props.alpha !== undefined) opts.alpha = props.alpha;
      if (props.antialias !== undefined) opts.antialias = props.antialias;
      // 公共参数也在构造时带上，省掉「先建好再 setXxx」的一帧抖动
      if (props.visible !== undefined) opts.visible = props.visible;
      if (props.minZoom !== undefined) opts.minZoom = props.minZoom;
      if (props.maxZoom !== undefined) opts.maxZoom = props.maxZoom;
      if (props.zIndex !== undefined) opts.zIndex = props.zIndex;
      if (props.opacity !== undefined) opts.opacity = props.opacity;
      if (props.referCenter !== undefined) opts.referCenter = toSDKPoint(props.referCenter);

      // 固定 wrapper + 现读最新回调：options 在构造时定型，回调换了不该重建图层
      const hook = (get: () => ThreeLayerHook | undefined) =>
        function (this: ThreeLayerInstance, renderer: ThreeObject, scene: ThreeObject, camera: ThreeObject) {
          get()?.call(this, renderer, scene, camera, handle);
        };
      opts.onInit = hook(() => props.onInit);
      opts.preRender = hook(() => props.preRender);
      opts.afterRender = hook(() => props.afterRender);
      opts.onDestroy = hook(() => props.onDestroy);
      opts.onHide = hook(() => props.onHide);
      opts.onShow = hook(() => props.onShow);
      // 只有真的传了 onRender 才把它挂进 options：SDK 是
      // `this.options.onRender ? 自定义 : renderer.render(scene, camera)`，
      // 无条件挂一个 wrapper 会把默认渲染整个关掉 → 画面全空。
      if (props.onRender) {
        opts.onRender = function (this: ThreeLayerInstance, renderer: ThreeObject, scene: ThreeObject, camera: ThreeObject) {
          const fn = props.onRender;
          // 运行期把 onRender 撤成 undefined 时兜底走默认渲染，否则画面会停住
          if (fn) fn.call(this, renderer, scene, camera, handle);
          else renderer.render(scene, camera);
        };
      }

      const h = driver.createThreeLayer(opts);
      if (!h) return;
      layerHandle = h;
      rawInstance = (h.raw as ThreeLayerInstance);
      driver.addLayer(map, h);
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (layerHandle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, layerHandle); } catch { /* ignore */ } }
      layerHandle = null;
      rawInstance = null;
    };

    // create + add（只有构造期才生效的参数变化时重建）：alpha / antialias / 是否接了 onRender
    const ctorKey = () => stableKey(props.alpha, props.antialias, !!props.onRender);
    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // setVisible
    watch(() => props.visible, (v) => {
      if (!rawInstance || v === undefined) return;
      try { (rawInstance as any).setVisible?.(v); } catch (e) { debugWarn('ThreeLayer.setVisible', e); }
    });
    // setMinZoom / setMaxZoom（SDK 会拒绝越界值：minZoom > maxZoom 时静默不改）
    watch(() => props.minZoom, (v) => {
      if (!rawInstance || v === undefined) return;
      try { (rawInstance as any).setMinZoom?.(v); } catch (e) { debugWarn('ThreeLayer.setMinZoom', e); }
    });
    watch(() => props.maxZoom, (v) => {
      if (!rawInstance || v === undefined) return;
      try { (rawInstance as any).setMaxZoom?.(v); } catch (e) { debugWarn('ThreeLayer.setMaxZoom', e); }
    });
    // setZIndex
    watch(() => props.zIndex, (v) => {
      if (!rawInstance || v === undefined) return;
      try { (rawInstance as any).setZIndex?.(v); } catch (e) { debugWarn('ThreeLayer.setZIndex', e); }
    });
    // setRefCenter（SDK 要求 instanceof Point）
    watch(() => [props.referCenter?.lng, props.referCenter?.lat], () => {
      if (!rawInstance || props.referCenter === undefined) return;
      const pt = toSDKPoint(props.referCenter);
      if (!pt) return;
      try { (rawInstance as any).setRefCenter?.(pt); } catch (e) { debugWarn('ThreeLayer.setRefCenter', e); }
    });
    // opacity：照样喂给 SDK（getOpacity 能读回一致的值），但 ThreeLayer 的 render 不读它
    watch(() => props.opacity, (v) => {
      if (v === undefined) return;
      if (!warnedOpacity) {
        warnedOpacity = true;
        devWarn('<ThreeLayer> 的 opacity 对本图层无效：ThreeLayer.render 从不读 this.opacity，透明度请设在 three.js 材质上（material.transparent + material.opacity）。');
      }
      if (!rawInstance) return;
      try { (rawInstance as any).setOpacity?.(v); } catch (e) { debugWarn('ThreeLayer.setOpacity', e); }
    });

    onUnmounted(destroy);
    return () => null;
  },
});

/** ctorKey 序列化：alpha / antialias / hasOnRender，任一变化即重建。 */
function stableKey(alpha?: boolean, antialias?: boolean, hasOnRender?: boolean): string {
  return `${alpha ?? ''}|${antialias ?? ''}|${hasOnRender}`;
}
