/**
 * PlaceDetail —— 地点详情组件（v4+）。对应 react-bmap 的 Overlay/PlaceDetail.tsx。
 *
 * 用法：嵌套在 <Marker> 内，通过 `open` prop 控制。
 *
 * 实现要点：
 * - 创建 PlaceDetail 服务实例（需要 container DOM，内部自动创建隐藏 div）
 * - setData(uid) 设置 POI 数据
 * - open=true → marker.openPlaceDetail(pd)；open=false → marker.closePlaceDetail()
 * - v4+ only；v3 下 isNull=true，组件 noop
 * - SDK 的 openPlaceDetail 只锚定一次，用轮询在 marker 移动时重新 open
 */
import { defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY } from '../../context';
import type { OverlayHandle, ServiceHandle } from '../../types';

export interface PlaceDetailRenderOptions {
  displayCarousel?: boolean;
  displayTag?: boolean;
  displayRating?: boolean;
  displayPrice?: boolean;
  displayBangdan?: boolean;
  displayTradeTag?: boolean;
  displayShopHours?: boolean;
  displayContactInformation?: boolean;
  contactInformationCount?: number;
  displayAddress?: boolean;
  displayComment?: boolean;
  displayCommentTotalCount?: boolean;
}

export interface PlaceDetailOptions {
  renderOptions?: PlaceDetailRenderOptions;
  /** 紧凑模式（地图内 overlay 展示时自动启用） */
  compact?: boolean;
}

export interface PlaceDetailProps {
  /** POI uid（百度地图地点唯一标识） */
  uid: string;
  /** 受控：true=打开, false=关闭。不传则 mount 时自动打开 */
  open?: boolean;
  /** PlaceDetailOptions 透传 */
  options?: PlaceDetailOptions;
}

export const PlaceDetail = defineComponent({
  name: 'PlaceDetail',
  props: {
    uid: { type: String, required: true },
    open: { type: Boolean, default: true },
    options: { type: Object as PropType<PlaceDetailOptions>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    const target = inject(OVERLAY_TARGET_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <PlaceDetail> 必须用在 <Map> 内部');

    let pd: ServiceHandle | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const driverOf = () => mapCtx.value?.driver ?? null;
    const targetHandle = () => (target?.handle.value ?? null) as OverlayHandle | null;

    // 创建 PlaceDetail 实例
    const create = () => {
      const driver = driverOf();
      if (!driver) return;
      const container = document.createElement('div');
      const handle = driver.createPlaceDetail({ container, ...(props.options ?? {}) });
      if (!handle || handle.isNull) {
        if (typeof console !== 'undefined') {
          console.warn('[vue-bmap] PlaceDetail not supported in this JSAPI version (requires 4.0+)');
        }
        return;
      }
      pd = handle;
      // 实例创建后立刻 setData 当前 uid
      const raw = (pd as any).raw;
      raw?.setData?.(props.uid);
    };

    const destroy = () => {
      stopWatchPosition();
      const raw = (pd as any)?.raw;
      raw?.dispose?.();
      pd = null;
    };

    const stopWatchPosition = () => {
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
    };

    // open/close 控制（需要父 Marker）
    const applyOpen = () => {
      const driver = driverOf();
      const tgt = targetHandle();
      stopWatchPosition();
      if (!driver || !tgt || !pd) return;
      if (!props.open) {
        driver.closePlaceDetail(tgt);
        return;
      }
      driver.openPlaceDetail(tgt, pd);
      // marker 位置变化时重新 open（openPlaceDetail 只锚定一次，不跟随 marker 移动）
      const raw = (tgt as any)?.raw;
      let lastPos = '';
      const initPos = raw?.getPosition?.();
      if (initPos) lastPos = `${initPos.lng},${initPos.lat}`;
      intervalId = setInterval(() => {
        const pos = raw?.getPosition?.();
        if (!pos) return;
        const key = `${pos.lng},${pos.lat}`;
        if (key !== lastPos) {
          lastPos = key;
          try {
            driver.closePlaceDetail(tgt);
            driver.openPlaceDetail(tgt, pd!);
          } catch { /* ignore */ }
        }
      }, 200);
    };

    const optsKey = () => JSON.stringify(props.options ?? {});

    // 实例随 driver / options 变化重建
    watch([() => mapCtx.value?.driver, optsKey], () => { destroy(); create(); applyOpen(); }, { immediate: true });
    // uid 变化时 setData
    watch(() => props.uid, (uid) => {
      const raw = (pd as any)?.raw;
      if (raw && uid) raw.setData?.(uid);
    });
    // open 或 target 就绪变化时应用
    watch([() => props.open, () => target?.handle.value], applyOpen);

    onUnmounted(destroy);
    // PlaceDetail 不渲染 children 到 DOM（内容通过 SDK overlay 渲染）
    return () => null;
  },
});
