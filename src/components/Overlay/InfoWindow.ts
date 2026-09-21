/**
 * InfoWindow —— 信息窗口组件。对应 react-bmap 的 Overlay/InfoWindow.tsx。
 *
 * 不走 addOverlay/removeOverlay，而是通过 openInfoWindow/closeInfoWindow 控制。
 * - 嵌套在 <Marker> 内：自动挂到 marker（marker.openInfoWindow）。
 * - 独立用（挂到 map）：需传 position。
 */
import { defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { getSDK } from '../../utils/sdk';
import type { OverlayHandle, Point } from '../../types';

export const InfoWindow = defineComponent({
  name: 'InfoWindow',
  props: {
    content: { type: [String, Object] as PropType<string | HTMLElement>, required: true },
    open: { type: Boolean, default: true },
    position: { type: Object as PropType<Point>, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    maxWidth: { type: Number, default: undefined },
    offset: { default: undefined },
    title: { type: String, default: undefined },
    enableAutoPan: { type: Boolean, default: undefined },
    enableCloseOnClick: { type: Boolean, default: undefined },
    enableMessage: { type: Boolean, default: undefined },
    message: { type: String, default: undefined },
    maxContent: { type: String, default: undefined },
    enableMaximize: { type: Boolean, default: undefined },
    enableSearchTool: { type: Boolean, default: undefined },
    onOpen: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
    onClose: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
    onClickClose: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
    onMaximize: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
    onRestore: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
    onResize: { type: Function as PropType<(raw: unknown) => void>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    const target = inject(OVERLAY_TARGET_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <InfoWindow> 必须用在 <Map> 内部');

    let iw: OverlayHandle | null = null;
    let handlers: { event: string; fn: (e: unknown) => void }[] = [];

    const openTargetRaw = () => {
      const t = target?.handle.value as any;
      const tgt = t ?? mapCtx.value?.map;
      return tgt?.raw ?? tgt;
    };

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx?.driver) return;
      const raw = {
        width: props.width, height: props.height, maxWidth: props.maxWidth, offset: props.offset,
        title: props.title, enableAutoPan: props.enableAutoPan, enableCloseOnClick: props.enableCloseOnClick,
        enableMessage: props.enableMessage, message: props.message, maxContent: props.maxContent,
        enableMaximize: props.enableMaximize, enableSearchTool: props.enableSearchTool,
      };
      const opts: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) if (v !== undefined && v !== null) opts[k] = v;
      const h = ctx.driver.createInfoWindow(props.content, opts);
      if (!h) return;
      iw = h;
      const rawIW = (h as any).raw;
      const map: Array<[string, keyof typeof props]> = [
        ['open', 'onOpen'], ['close', 'onClose'], ['clickclose', 'onClickClose'],
        ['maximize', 'onMaximize'], ['restore', 'onRestore'], ['resize', 'onResize'],
      ];
      for (const [event, prop] of map) {
        const fn = (e: unknown) => { const cb = (props as any)[prop]; if (typeof cb === 'function') cb(e); };
        rawIW?.addEventListener?.(event, fn);
        handlers.push({ event, fn });
      }
      applyOpen();
    };

    const destroy = () => {
      const rawIW = (iw as any)?.raw;
      for (const { event, fn } of handlers) rawIW?.removeEventListener?.(event, fn);
      handlers = [];
      const tgt = openTargetRaw();
      if (tgt) { try { tgt.closeInfoWindow?.(); } catch { /* ignore */ } }
      iw = null;
    };

    const applyOpen = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !iw) return;
      const rawTarget = openTargetRaw();
      const rawIW = (iw as any).raw;
      if (props.open) {
        try {
          if (props.position) {
            const SDK = getSDK();
            rawTarget?.openInfoWindow?.(rawIW, new SDK.Point(props.position.lng, props.position.lat));
          } else if (typeof rawTarget?.openInfoWindow === 'function') {
            rawTarget.openInfoWindow(rawIW);
          }
        } catch (e) { console.warn('[vue-bmap] InfoWindow open failed', e); }
      } else {
        try { rawTarget?.closeInfoWindow?.(); } catch { /* ignore */ } }
    };

    const ctorKey = () => stableStringify({
      maxWidth: props.maxWidth, offset: props.offset, enableCloseOnClick: props.enableCloseOnClick,
      enableMessage: props.enableMessage, message: props.message, enableSearchTool: props.enableSearchTool,
    });

    watch([() => mapCtx.value?.map, () => target?.handle.value, ctorKey], () => { destroy(); create(); }, { immediate: true });
    // setter 类属性
    watch(() => props.content, (v) => { const r = (iw as any)?.raw; if (r && v != null) r.setContent?.(v); });
    watch(() => props.title, (v) => { const r = (iw as any)?.raw; if (r && v != null) r.setTitle?.(v); });
    watch(() => props.width, (v) => { const r = (iw as any)?.raw; if (r && v != null) r.setWidth?.(v); });
    watch(() => props.height, (v) => { const r = (iw as any)?.raw; if (r && v != null) r.setHeight?.(v); });
    watch(() => props.maxContent, (v) => { const r = (iw as any)?.raw; if (r && v != null) r.setMaxContent?.(v); });
    watch([() => props.open, () => props.position?.lng, () => props.position?.lat], applyOpen);

    onUnmounted(destroy);
    return () => null;
  },
});
