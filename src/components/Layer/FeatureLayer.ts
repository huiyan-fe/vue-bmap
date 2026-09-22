/**
 * FeatureLayer —— 矢量要素图层（手写组件，继承 NormalLayer）。@since 4.0
 * 对应 react-bmap 的 Layer/FeatureLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <FeatureLayer id-key="id" crs="BD09LL" enable-picked selected-color="rgba(255,0,0,1)" :data="geojson" />
 * ```
 *
 * 实现要点（与 react 对齐）：
 * - mount → driver.createFeatureLayer + addLayer
 * - data 变化 → raw.setData()
 * - 构造期选项变化（ctorKey）→ 销毁重建
 *
 * React→Vue：useState→ref、useEffect→watch/onUnmounted、props.children 无（return null）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';
import type { NormalLayerOptions } from './index';

export interface FeatureLayerOptions extends NormalLayerOptions {
  /** 数据项属性 key */
  idKey?: string;
  /** 来源坐标系，可选 BD09LL、BD09MC、GCJ02 */
  crs?: string;
  /** 选中数据索引 */
  selectedIndex?: number;
  /** 选中数据颜色 */
  selectedColor?: string;
}

export interface FeatureLayerProps extends FeatureLayerOptions {
  /** GeoJSON 数据源，变化时调用 raw.setData() */
  data?: object;
}

export const FeatureLayer = defineComponent({
  name: 'FeatureLayer',
  props: {
    idKey: { type: String, default: undefined },
    crs: { type: String, default: undefined },
    selectedIndex: { type: Number, default: undefined },
    selectedColor: { type: String, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    autoSelect: { type: Boolean, default: undefined },
    zIndex: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    data: { type: Object as PropType<object>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <FeatureLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    // ctorKey 只含构造期选项；data 走 setData 不进 ctorKey
    const ctorKey = computed(() => stableStringify([
      props.idKey, props.crs, props.selectedIndex, props.selectedColor, props.visible,
      props.opacity, props.enablePicked, props.autoSelect, props.zIndex, props.minZoom, props.maxZoom,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('idKey', props.idKey); put('crs', props.crs);
      put('selectedIndex', props.selectedIndex); put('selectedColor', props.selectedColor);
      put('visible', props.visible); put('opacity', props.opacity);
      put('enablePicked', props.enablePicked); put('autoSelect', props.autoSelect);
      put('zIndex', props.zIndex); put('minZoom', props.minZoom); put('maxZoom', props.maxZoom);

      const h = driver.createFeatureLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      // mount 后如果有 data，立即 setData
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('FeatureLayer.setData', e); }
      }
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // data 变化 → setData（create 已喂过初始数据，此 watch 非 immediate，只在变化时触发）
    watch(() => stableStringify(props.data), () => {
      if (!handle?.raw || !props.data) return;
      try { (handle.raw as any).setData?.(props.data); } catch { /* noop */ }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
