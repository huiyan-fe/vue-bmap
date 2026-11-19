/**
 * WebGLCustomLayer —— 用户自定义着色器图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.WebGLCustomLayer。
 *
 * 用法：
 * ```vue
 * <WebGLCustomLayer :vertex-shader="vs" :fragment-shader="fs"
 *   :attributes="{ a_pos: { data: [[116.4, 39.9]], type: 'lnglat' } }"
 *   :uniforms="{ u_color: [1, 0, 0.5, 1] }" :draw="{ mode: 'POINTS' }" />
 * ```
 *
 * - 面向自写 WebGL：给 GLSL 源码 + 声明式数据，即可在地图的 GL 上下文里绘制。顶点用
 *   **图层局部坐标**（相对 referCenter 的墨卡托米），`projectToLayer([lng, lat])` 换算。
 * - SDK 的设计是「构造参数与运行时方法一一对等」：凡能写进 options 的
 *   （attributes / vertices / indices / uniforms / textures / draw / renderState）都有同名
 *   的 `layer.setXxx()` 与 `ctx.setXxx()`。本组件构造项变化走**重建**（ctorKey 覆盖全部
 *   options），需要逐帧更新（动画 uniform / 几何）时用 `ref` 句柄的命令式方法，避免重建。
 * - SDK 不派发 ready / render / destroy / error 事件，生命周期回调走构造参数
 *   （onReady(ctx) / onRender(ctx) / onDestroy(ctx) / onError(err)）；回调用固定 wrapper
 *   现读最新 prop，改回调不重建图层。`onRender` 一旦提供会**接管**绘制（SDK if/else：
 *   声明式 `draw` 不再自动执行），运行期撤掉时兜底回声明式 draw。
 * - 全局 GL 状态一律由框架代管（深度 / 混合 / 剔除只能经 renderState 表达）；
 *   真要原生上下文请传 `unsafeGL`（此时 ctx.gl 是完整原生上下文）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { tryGetSDK } from '../../utils/sdk';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle, Point } from '../../types';

export interface WebGLCustomLayerOptions {
  /** 顶点着色器源码（必填） */
  vertexShader?: string;
  /** 片元着色器源码（必填） */
  fragmentShader?: string;
  /** 声明式顶点属性：{name: {data, type, stride, members}}，type 'lnglat' 按 referCenter 自动投影 */
  attributes?: Record<string, unknown>;
  /** 顶点缓冲：{data, stride, members} */
  vertices?: unknown;
  /** 索引（Array | Uint16Array | Uint32Array） */
  indices?: unknown;
  /** 声明式 uniform：{name: value} */
  uniforms?: Record<string, unknown>;
  /** 声明式纹理：{name: url 或 {source, wrap, filter, flipY, mipmap}} */
  textures?: Record<string, unknown>;
  /** 绘制指令：{mode, count, first, offset} */
  draw?: Record<string, unknown>;
  /** 渲染状态：{depthTest, depthWrite, depthFunc, blend, cullFace, frontFace} */
  renderState?: Record<string, unknown>;
  /** 是否逐帧重绘（u_time 持续推进，做流动/呼吸效果），默认 false */
  animation?: boolean;
  /** true 时 ctx.gl 是完整原生上下文（框架走完整 save/restore），默认 false */
  unsafeGL?: boolean;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  minZoom?: number;
  maxZoom?: number;
  /** 渲染阶段：'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi'，默认 'tilelayer' */
  renderStage?: 'basemap' | 'tilelayer' | 'overlay' | 'building' | 'poi';
  /** 参考中心点（SDK 要求 instanceof Point）。顶点局部坐标的原点，大坐标场景强烈建议给 */
  referCenter?: Point;
}

export interface WebGLCustomLayerProps extends WebGLCustomLayerOptions {
  /** 着色器编译完成、声明式数据重放完毕后调用，ctx 与 onRender 拿到的是同一个 CustomRenderContext */
  onReady?: WebGLCustomLayerHook;
  /** 每帧绘制。提供它即接管绘制（声明式 draw 不再自动执行）；不提供则按声明式 draw 画一次 */
  onRender?: WebGLCustomLayerHook;
  /** 图层销毁前回调（拿到 gl，与绘制路径同款状态三明治） */
  onDestroy?: WebGLCustomLayerHook;
  /** 出错回调：err = {type, message, source}；着色器编译/链接失败会把图层置为 error */
  onError?: (err: unknown) => void;
}

/** 绘制上下文（SDK CustomRenderContext）。声明式数据的运行时等价入口：setUniforms / setAttributes / setDraw / ... */
export interface WebGLCustomLayerContext {
  /** 白名单 GL 门面：资源类调用直通，全局状态类调用告警并忽略（除非 unsafeGL） */
  gl: unknown;
  setUniform: (name: string, value: unknown) => void;
  setUniforms: (obj: Record<string, unknown>) => void;
  setAttribute: (name: string, spec: unknown) => void;
  setAttributes: (obj: Record<string, unknown>) => void;
  setVertices: (spec: unknown) => void;
  setIndices: (data: unknown) => void;
  setTexture: (name: string, source: unknown, opts?: unknown) => void;
  setTextures: (obj: Record<string, unknown>) => void;
  setDraw: (spec: Record<string, unknown>) => void;
  draw: () => void;
  [key: string]: unknown;
}

export type WebGLCustomLayerHook = (ctx: WebGLCustomLayerContext) => void;

/** 命令式句柄（组件 expose 同名对象，`ref` 取用），方法名对齐 JSAPI WebGLCustomLayer。 */
export interface WebGLCustomLayerRef {
  /** 更新 uniform：{name: value}；与构造参数对等，走运行时路径不重建 */
  setUniforms: (obj: Record<string, unknown>) => void;
  setUniform: (name: string, value: unknown) => void;
  setAttributes: (obj: Record<string, unknown>) => void;
  setAttribute: (name: string, spec: unknown) => void;
  setVertices: (spec: unknown) => void;
  setIndices: (data: unknown) => void;
  setTextures: (obj: Record<string, unknown>) => void;
  setTexture: (name: string, source: unknown, opts?: unknown) => void;
  setDraw: (spec: Record<string, unknown>) => void;
  /** 只有这一条路能改深度 / 混合 / 剔除（每帧经 WebGLState 施加、画完还原） */
  setRenderState: (state: Record<string, unknown>) => void;
  getRenderState: () => Record<string, unknown>;
  /** 换着色器：重新编译、重建 VAO，已有 attribute / uniform / 纹理原样重放 */
  setShaders: (vertexShader: string, fragmentShader: string) => void;
  /** 'pending'（着色器还没编译好）| 'ready' | 'error' */
  getStatus: () => string;
  /** 图层加入地图起算的秒数（u_time 的数据源） */
  getTime: () => number;
  /** 绘制上下文，与 onReady / onRender 拿到的是同一个 */
  getContext: () => WebGLCustomLayerContext | null;
  /** 经纬度 → 图层局部坐标（相对 referCenter 的墨卡托米）；不依赖是否已 addTo(map) */
  projectToLayer: (lngLat: unknown) => unknown;
  /** 图层局部坐标 → 经纬度（交互回换算地理坐标用） */
  unprojectFromLayer: (xy: unknown) => unknown;
  startAnimation: () => void;
  stopAnimation: () => void;
  isAnimating: () => boolean;
}

/** referCenter：SDK 的 _getBaseMC 直接 crsLL2MC(center)，要求真实 Point */
function toSDKPoint(point: Point): unknown {
  const SDK = tryGetSDK();
  return SDK ? new SDK.Point(point.lng, point.lat) : undefined;
}

export const WebGLCustomLayer = defineComponent({
  name: 'WebGLCustomLayer',
  props: {
    vertexShader: { type: String, default: undefined },
    fragmentShader: { type: String, default: undefined },
    attributes: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    vertices: { default: undefined },
    indices: { default: undefined },
    uniforms: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    textures: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    draw: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    renderState: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    animation: { type: Boolean, default: undefined },
    unsafeGL: { type: Boolean, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    renderStage: { type: String as PropType<WebGLCustomLayerOptions['renderStage']>, default: undefined },
    referCenter: { type: Object as PropType<Point>, default: undefined },
    onReady: { type: Function as PropType<WebGLCustomLayerHook>, default: undefined },
    onRender: { type: Function as PropType<WebGLCustomLayerHook>, default: undefined },
    onDestroy: { type: Function as PropType<WebGLCustomLayerHook>, default: undefined },
    onError: { type: Function as PropType<(err: unknown) => void>, default: undefined },
  },
  setup(props: any, { expose }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <WebGLCustomLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    const rawOf = () => (handle ? (handle as { raw: unknown }).raw as any : null);
    /** 命令式句柄：句柄本身稳定，方法体内现读原生实例（GL 就绪前为 no-op）。与 SDK 「构造参数 ⇄ 运行时方法」对等 */
    const refHandle: WebGLCustomLayerRef = {
      setUniforms: (o) => { try { rawOf()?.setUniforms?.(o); } catch { /* ignore */ } },
      setUniform: (n, v) => { try { rawOf()?.setUniform?.(n, v); } catch { /* ignore */ } },
      setAttributes: (o) => { try { rawOf()?.setAttributes?.(o); } catch { /* ignore */ } },
      setAttribute: (n, s) => { try { rawOf()?.setAttribute?.(n, s); } catch { /* ignore */ } },
      setVertices: (s) => { try { rawOf()?.setVertices?.(s); } catch { /* ignore */ } },
      setIndices: (d) => { try { rawOf()?.setIndices?.(d); } catch { /* ignore */ } },
      setTextures: (o) => { try { rawOf()?.setTextures?.(o); } catch { /* ignore */ } },
      setTexture: (n, s, o) => { try { rawOf()?.setTexture?.(n, s, o); } catch { /* ignore */ } },
      setDraw: (s) => { try { rawOf()?.setDraw?.(s); } catch { /* ignore */ } },
      setRenderState: (s) => { try { rawOf()?.setRenderState?.(s); } catch { /* ignore */ } },
      getRenderState: () => { try { return rawOf()?.getRenderState?.() ?? {}; } catch { return {}; } },
      setShaders: (vs, fs) => { try { rawOf()?.setShaders?.(vs, fs); } catch { /* ignore */ } },
      getStatus: () => { try { return rawOf()?.getStatus?.() ?? 'pending'; } catch { return 'pending'; } },
      getTime: () => { try { return rawOf()?.getTime?.() ?? 0; } catch { return 0; } },
      getContext: () => { try { return rawOf()?.getContext?.() ?? null; } catch { return null; } },
      projectToLayer: (lngLat) => { try { return rawOf()?.projectToLayer?.(lngLat) ?? lngLat; } catch { return lngLat; } },
      unprojectFromLayer: (xy) => { try { return rawOf()?.unprojectFromLayer?.(xy) ?? xy; } catch { return xy; } },
      startAnimation: () => { try { rawOf()?.startAnimation?.(); } catch { /* ignore */ } },
      stopAnimation: () => { try { rawOf()?.stopAnimation?.(); } catch { /* ignore */ } },
      isAnimating: () => { try { return !!rawOf()?.isAnimating?.(); } catch { return false; } },
    };
    expose(refHandle);

    // 构造项变化 → 重建（SDK 构造参数与运行时方法对等，此处统一走重建；逐帧更新走 ref 句柄）
    const ctorKey = computed(() => stableStringify([
      props.vertexShader, props.fragmentShader,
      props.attributes, props.vertices, props.indices,
      props.uniforms, props.textures, props.draw, props.renderState,
      props.animation, props.unsafeGL,
      props.visible, props.opacity, props.zIndex, props.minZoom, props.maxZoom,
      props.renderStage, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('vertexShader', props.vertexShader); put('fragmentShader', props.fragmentShader);
      put('attributes', props.attributes); put('vertices', props.vertices); put('indices', props.indices);
      put('uniforms', props.uniforms); put('textures', props.textures); put('draw', props.draw);
      put('renderState', props.renderState); put('animation', props.animation); put('unsafeGL', props.unsafeGL);
      put('visible', props.visible); put('opacity', props.opacity); put('zIndex', props.zIndex);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('renderStage', props.renderStage);
      if (props.referCenter !== undefined) opts.referCenter = toSDKPoint(props.referCenter);

      // 固定 wrapper + 现读最新回调：SDK 回调签名 onReady(ctx) / onRender(ctx) / onDestroy(ctx) / onError(err)
      opts.onReady = (ctxArg: WebGLCustomLayerContext) => {
        const fn = props.onReady as WebGLCustomLayerHook | undefined;
        if (typeof fn === 'function') fn(ctxArg);
      };
      opts.onDestroy = (ctxArg: WebGLCustomLayerContext) => {
        const fn = props.onDestroy as WebGLCustomLayerHook | undefined;
        if (typeof fn === 'function') fn(ctxArg);
      };
      opts.onError = (err: unknown) => {
        const fn = props.onError as ((err: unknown) => void) | undefined;
        if (typeof fn === 'function') fn(err);
      };
      // 只有真的传了 onRender 才挂进 options：SDK 是 `onRender ? 回调 : 声明式 draw`，
      // 无条件挂 wrapper 会让声明式 draw 永不执行 → 画面全空
      if (props.onRender) {
        opts.onRender = (ctxArg: WebGLCustomLayerContext) => {
          const fn = props.onRender as WebGLCustomLayerHook | undefined;
          if (fn) fn(ctxArg);
          else (ctxArg as { draw?: () => void }).draw?.();
        };
      }

      const h = driver.createWebGLCustomLayer(opts);
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

    onUnmounted(destroy);
    return () => null;
  },
});
