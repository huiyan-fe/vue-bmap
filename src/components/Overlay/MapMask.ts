/**
 * MapMask —— 区域掩膜组件（v4+ WebGL only）。对应 react-bmap 的 Overlay/MapMask.tsx。
 *
 * SDK constructor(path: Point[], options) —— 注意是 Point 数组（闭合路径），不是 Bounds。
 * 无 setter（showRegion/isBuildingMask/isPoiMask/isMapMask 都是构造参数）。
 *
 * 区域两种传法（二选一，`points` 优先）：
 * - `points`：任意多边形路径（Point[]），直接对应 SDK 的 path 入参；未闭合时自动补首点。
 * - `bounds`：矩形区域简写 { sw, ne }，内部转成矩形四角路径。
 *
 * 走 driver.addOverlay/removeOverlay（type: 'custom'）挂载，ctor 参数变化时重建。
 */
import { defineComponent, inject, onMounted, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { tryGetSDK } from '../../utils/sdk';
import { devWarn } from '../../utils/debugWarn';
import type { Bounds, OverlayHandle, Point } from '../../types';

export interface MapMaskOptions {
  showRegion?: 'inside' | 'outside';
  isBuildingMask?: boolean;
  isPoiMask?: boolean;
  isMapMask?: boolean;
}

export interface MapMaskProps extends MapMaskOptions {
  /** 任意多边形遮罩路径（Point[]）；与 bounds 二选一，同时传时以 points 为准。未闭合会自动补首点。 */
  points?: Point[];
  /** 矩形遮罩区简写 { sw, ne }，内部转成矩形路径；与 points 二选一。 */
  bounds?: Bounds;
}

export const MapMask = defineComponent({
  name: 'MapMask',
  props: {
    points: { type: Array as PropType<Point[]>, default: undefined },
    bounds: { type: Object as PropType<Bounds>, default: undefined },
    showRegion: { type: String as PropType<'inside' | 'outside'>, default: undefined },
    isBuildingMask: { type: Boolean, default: undefined },
    isPoiMask: { type: Boolean, default: undefined },
    isMapMask: { type: Boolean, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <MapMask> 必须用在 <Map> 内部');

    let handle: OverlayHandle | null = null;

    const optsOf = (): MapMaskOptions => ({
      showRegion: props.showRegion,
      isBuildingMask: props.isBuildingMask,
      isPoiMask: props.isPoiMask,
      isMapMask: props.isMapMask,
    });

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx?.map || !ctx.driver) return;
      const SDK = tryGetSDK();
      if (!SDK?.MapMask) return;

      // SDK 期望未闭合的 Point[]（内部自动闭合，见官方 AreaMask 示例）。points 优先；否则用 bounds 转矩形四角。
      // 注意：不要手动补闭合点——三角形补成 [A,B,C,A] 会因重复顶点导致掩膜三角化退化、渲染不出来。
      let pts: BMap.Point[];
      const points = props.points as Point[] | undefined;
      const bounds = props.bounds as Bounds | undefined;
      if (points && points.length > 0) {
        pts = points.map((p) => new SDK.Point(p.lng, p.lat));
      } else if (bounds) {
        const sw = bounds.sw;
        const ne = bounds.ne;
        pts = [
          new SDK.Point(sw.lng, sw.lat),
          new SDK.Point(ne.lng, sw.lat),
          new SDK.Point(ne.lng, ne.lat),
          new SDK.Point(sw.lng, ne.lat),
        ];
      } else {
        devWarn('MapMask 需要传 points 或 bounds 之一，本次未渲染。');
        return;
      }

      const opts = optsOf();
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(opts)) if (v !== undefined) cleaned[k] = v;
      const mask = new SDK.MapMask(pts, cleaned);
      handle = { __brand: 'OverlayHandle', raw: mask, type: 'custom' } as OverlayHandle;
      ctx.driver.addOverlay(ctx.map, handle);
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map && ctx.driver) {
        // 关键：移除 MapMask 前先 hide()。直接 removeOverlay 会让 SDK 在移除过程中
        // 触发一次填充重绘（buildFillVertex → _toOverlayPixelsGL），此时掩膜路径点已被置空，
        // 读 null.lng 抛错、渲染态被污染，导致后续新掩膜不显示。先隐藏可跳过这次重绘。
        try { (handle.raw as { hide?: () => void } | null)?.hide?.(); } catch { /* ignore */ }
        try { ctx.driver.removeOverlay(ctx.map, handle); } catch { /* ignore */ }
      }
      handle = null;
    };

    const recreate = () => { destroy(); create(); };

    // 首次创建放到 onMounted（post-flush），而不是 immediate watch（会在 setup/pre-flush 阶段执行）。
    // 原因：同一次 mode 切换里，旧 MapMask 卸载走 onUnmounted→destroy（patch 阶段），
    // 新 MapMask 若用 immediate watch 会在旧的 destroy 之前就 create，导致「先加新掩膜、再移除旧掩膜」，
    // 旧掩膜移除时的 GL 重绘把刚加的新掩膜也一起冲掉 → 新掩膜不显示（只有再手动改 showRegion 触发重建才出来）。
    // 放到 onMounted 后，顺序变成「旧 destroy → 新 create」，与 react 的 cleanup-before-setup 一致。
    watch(
      [
        () => mapCtx.value?.map,
        () => stableStringify(props.points),
        () => stableStringify(props.bounds),
        () => stableStringify(optsOf()),
      ],
      recreate,
    );
    onMounted(() => { if (!handle) create(); });

    onUnmounted(destroy);
    return () => null;
  },
});
