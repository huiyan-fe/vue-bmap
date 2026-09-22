/**
 * SimpleInfoWindow —— 简单信息窗口组件（v4+ WebGL only）。对应 react-bmap 的 Overlay/SimpleInfoWindow.tsx。
 *
 * SDK: constructor(content, opts)；open: map.openSimpleInfoWindow(iw, point)；close: map.closeSimpleInfoWindow()。
 * 与 InfoWindow 不同，SimpleInfoWindow 是轻量级窗口，没有 maximize/message 等功能。
 *
 * - content/opts 变化时重建实例；open/position 变化时控制显隐。
 * - 事件 open/close/resize 成对 add/removeEventListener，onUnmounted 统一清理。
 */
import { defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { tryGetSDK } from '../../utils/sdk';
import type { OverlayHandle, Point, Size } from '../../types';

export interface SimpleInfoWindowOptions {
  width?: number;
  height?: number;
  maxWidth?: number;
  offset?: Size;
  title?: string;
  maxContent?: string;
  enableMaximize?: boolean;
  enableAutoPan?: boolean;
  enableCloseOnClick?: boolean;
}

export interface SimpleInfoWindowProps extends SimpleInfoWindowOptions {
  position: Point;
  /** 窗口内容（字符串或 HTML） */
  content: string;
  /** 是否打开 */
  open?: boolean;
  /** 事件 */
  onOpen?: () => void;
  onClose?: () => void;
  onResize?: () => void;
}

export const SimpleInfoWindow = defineComponent({
  name: 'SimpleInfoWindow',
  props: {
    position: { type: Object as PropType<Point>, required: true },
    content: { type: String, required: true },
    open: { type: Boolean, default: true },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    maxWidth: { type: Number, default: undefined },
    offset: { type: Object as PropType<Size>, default: undefined },
    title: { type: String, default: undefined },
    maxContent: { type: String, default: undefined },
    enableMaximize: { type: Boolean, default: undefined },
    enableAutoPan: { type: Boolean, default: undefined },
    enableCloseOnClick: { type: Boolean, default: undefined },
    onOpen: { type: Function as PropType<() => void>, default: undefined },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onResize: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <SimpleInfoWindow> 必须用在 <Map> 内部');

    let handle: OverlayHandle | null = null;
    let handlers: { event: string; fn: () => void }[] = [];

    const optsOf = (): SimpleInfoWindowOptions => ({
      width: props.width, height: props.height, maxWidth: props.maxWidth, offset: props.offset,
      title: props.title, maxContent: props.maxContent, enableMaximize: props.enableMaximize,
      enableAutoPan: props.enableAutoPan, enableCloseOnClick: props.enableCloseOnClick,
    });

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !ctx.driver) return;
      const SDK = tryGetSDK();
      if (!SDK?.SimpleInfoWindow) return;

      const opts = optsOf();
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null) cleaned[k] = v;

      // SDK 构造函数：SimpleInfoWindow(content, opts) —— content 是第一个参数
      const win = new SDK.SimpleInfoWindow(props.content, cleaned) as any;
      handle = { __brand: 'OverlayHandle', raw: win, type: 'infowindow' } as OverlayHandle;

      // SDK 构造函数的 setConfig 可能不处理 title/content，用 setter 补设
      if (props.title && typeof win.setTitle === 'function') win.setTitle(props.title);
      if (props.content && typeof win.setContent === 'function') win.setContent(props.content);
      if (props.maxContent && typeof win.setMaxContent === 'function') win.setMaxContent(props.maxContent);

      // 注册事件（回调在触发时从 props 读取最新引用）
      if (typeof win.addEventListener === 'function') {
        const bind = (event: string, prop: 'onOpen' | 'onClose' | 'onResize') => {
          const fn = () => { const cb = props[prop]; if (typeof cb === 'function') cb(); };
          win.addEventListener(event, fn);
          handlers.push({ event, fn });
        };
        bind('open', 'onOpen');
        bind('close', 'onClose');
        bind('resize', 'onResize');
      }

      applyOpen();
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      const rawWin = (handle as any)?.raw;
      for (const { event, fn } of handlers) rawWin?.removeEventListener?.(event, fn);
      handlers = [];
      if (ctx?.map && ctx.driver) { try { ctx.driver.closeSimpleInfoWindow(ctx.map); } catch { /* ignore */ } }
      handle = null;
    };

    const applyOpen = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !ctx.driver || !handle) return;
      if (props.open) {
        ctx.driver.openSimpleInfoWindow(ctx.map, handle, props.position);
      } else {
        try { ctx.driver.closeSimpleInfoWindow(ctx.map); } catch { /* ignore */ }
      }
    };

    const recreate = () => { destroy(); create(); };

    // 创建/重建：content 或 ctor opts 变化时
    watch(
      [() => mapCtx.value?.map, () => props.content, () => stableStringify(optsOf())],
      recreate,
      { immediate: true },
    );
    // open/position 变化控制显隐
    watch([() => props.open, () => props.position?.lng, () => props.position?.lat], applyOpen);

    onUnmounted(destroy);
    return () => null;
  },
});
