/**
 * ClusterLayer —— 点聚合图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.ClusterLayer。
 *
 * 用法：
 * ```vue
 * <ClusterLayer :data="points" :cluster-radius="60" @click="onClusterClick" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[]），聚合算法按屏幕像素半径逐级聚合。
 * - 构造项（clusterRadius / clusterMinPoints / clusterIcon / singleStyle / updateRealTime 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件对象带 value（聚合点：{isCluster, clusterId, pointCount, latLng, bbox, properties}；
 *   单点：{isCluster:false, properties}）：
 *   click / mouseover / mouseout / change（每次刷新后，value 为 {singles, clusters, zoom}）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface ClusterLayerOptions {
  /** 聚合半径（px），默认 60 */
  clusterRadius?: number;
  /** 成簇最小点数，默认 2 */
  clusterMinPoints?: number;
  /** 聚合起始层级，默认 3 */
  clusterMinZoom?: number;
  /** 聚合结束层级（大于该层级不再聚合），默认 16 */
  clusterMaxZoom?: number;
  /** 瓦片尺寸，参与半径归一化，默认 256 */
  tileSize?: number;
  /** 点击聚合点是否自动调整视野，默认 true */
  fitViewOnClick?: boolean;
  /** 调整视野边距 [上, 右, 下, 左]，默认 [12,12,12,12] */
  fitViewMargin?: number[];
  /** true：拖动/缩放过程中实时刷新；false：静止后刷新，默认 false */
  updateRealTime?: boolean;
  /** 实时刷新节流间隔（ms），默认 300 */
  waitTime?: number;
  /** 聚合点图标：function(properties) -> {canvas, id} | canvas | url */
  clusterIcon?: unknown;
  /** 聚合点图标尺寸：function(properties) -> [w, h] | number */
  clusterIconSize?: unknown;
  /** 单点样式，透传给内部 PointLayer（shape/size/fillColor/icon 等） */
  singleStyle?: Record<string, unknown>;
  opacity?: number;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface ClusterLayerProps extends ClusterLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const CLUSTER_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'change', prop: 'onChange' },
];

export const ClusterLayer = defineComponent({
  name: 'ClusterLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    clusterRadius: { type: Number, default: undefined },
    clusterMinPoints: { type: Number, default: undefined },
    clusterMinZoom: { type: Number, default: undefined },
    clusterMaxZoom: { type: Number, default: undefined },
    tileSize: { type: Number, default: undefined },
    fitViewOnClick: { type: Boolean, default: undefined },
    fitViewMargin: { type: Array as PropType<number[]>, default: undefined },
    updateRealTime: { type: Boolean, default: undefined },
    waitTime: { type: Number, default: undefined },
    clusterIcon: { default: undefined },
    clusterIconSize: { default: undefined },
    singleStyle: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    opacity: { type: Number, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    referCenter: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onChange: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <ClusterLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.clusterRadius, props.clusterMinPoints, props.clusterMinZoom, props.clusterMaxZoom,
      props.tileSize, props.fitViewOnClick, props.fitViewMargin,
      props.updateRealTime, props.waitTime,
      props.clusterIcon, props.clusterIconSize, props.singleStyle,
      props.opacity, props.visible, props.minZoom, props.maxZoom, props.zIndex,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('clusterRadius', props.clusterRadius); put('clusterMinPoints', props.clusterMinPoints);
      put('clusterMinZoom', props.clusterMinZoom); put('clusterMaxZoom', props.clusterMaxZoom);
      put('tileSize', props.tileSize); put('fitViewOnClick', props.fitViewOnClick);
      put('fitViewMargin', props.fitViewMargin); put('updateRealTime', props.updateRealTime);
      put('waitTime', props.waitTime); put('clusterIcon', props.clusterIcon);
      put('clusterIconSize', props.clusterIconSize); put('singleStyle', props.singleStyle);
      put('opacity', props.opacity); put('visible', props.visible);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createClusterLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of CLUSTER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('ClusterLayer.setData', e); }
      }
    };

    const destroy = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    watch(() => stableStringify(props.data), () => {
      if (!handle?.raw || !props.data) return;
      try { (handle.raw as any).setData?.(props.data); } catch { /* noop */ }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
