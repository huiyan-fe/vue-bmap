/**
 * Panorama + PanoramaLabel 组件。对应 react-bmap 的 Panorama/index.tsx。
 *
 * - <Panorama> 独立容器，创建 Panorama 实例，不在 <Map> 内也可使用（读 BMapProvider 状态）。
 * - <PanoramaLabel> 是全景标注，必须作为 <Panorama> 子组件（provide/inject 关联）。
 * - point/id 变化通过 setPosition/setId 响应式更新；pov/zoom/options/visible/滚轮/poiType 亦可运行时受控。
 * - 命令式：通过 expose 的 getPanoramaRef() 拿 PanoramaRef，可调 getPosition/getPov/capture 等。
 */
import {
  defineComponent, h, inject, onMounted, onUnmounted, provide, shallowRef, watch,
  type InjectionKey, type PropType, type ShallowRef, type StyleValue,
} from 'vue';
import { useBMapContext } from '../../context';
import { debugWarn } from '../../utils/debugWarn';
import { tryGetSDK } from '../../utils/sdk';
import type { MapHandle, OverlayHandle, Point } from '../../types';
import type { PanoramaPOIType } from '../../constants';
import { PanoramaRefImpl } from './PanoramaRef';
import type { PanoramaRef, PanoramaPov, PanoramaOptions } from './PanoramaRef';

export type { PanoramaRef, PanoramaPov, PanoramaOptions } from './PanoramaRef';

/** Panorama → PanoramaLabel 的注入键：下发已创建的全景句柄（未就绪时为 null）。 */
const PANORAMA_KEY: InjectionKey<ShallowRef<MapHandle | null>> = Symbol('vue-bmap:panorama');

export interface PanoramaProps {
  point?: Point;
  /** 通过全景 id 展示（与 point 二选一） */
  id?: string;
  /** 全景视角（heading 必填，pitch 可选） */
  pov?: PanoramaPov;
  /** 缩放级别 */
  zoom?: number;
  /** 全景配置：导航/道路/室内切换/相册控件 */
  options?: PanoramaOptions;
  /** 显隐控制：true→show()，false→hide() */
  visible?: boolean;
  /** 鼠标滚轮缩放开关 */
  enableScrollWheelZoom?: boolean;
  /** 外景场景点内可见的 POI 类型 */
  poiType?: PanoramaPOIType;
  style?: StyleValue;
  className?: string;
  /** 全景位置变化回调（position_changed） */
  onPositionChange?: (point: Point) => void;
  /** 视角变化回调（pov_changed） */
  onPovChange?: () => void;
  /** 相邻道路数据变化回调（links_changed） */
  onLinksChange?: () => void;
  /** 缩放级别变化回调（zoom_changed） */
  onZoomChange?: (zoom: number) => void;
  /** 单击全景画面（click） */
  onClick?: (e: unknown) => void;
  /** 双击全景画面（dblclick） */
  onDblClick?: (e: unknown) => void;
  /** 单击道路链接（link_click） */
  onLinkClick?: (e: unknown) => void;
  /** 全景 id 变化（id_changed） */
  onIdChange?: (id: string) => void;
  /** 场景类型变化（scene_type_changed） */
  onSceneTypeChange?: () => void;
  /** 全景数据加载失败（pano_error） */
  onError?: (e: unknown) => void;
  /** 全景数据加载完成（dataload） */
  onDataLoad?: (e: unknown) => void;
}

export const Panorama = defineComponent({
  name: 'Panorama',
  inheritAttrs: false,
  props: {
    point: { type: Object as PropType<Point>, default: undefined },
    id: { type: String, default: undefined },
    pov: { type: Object as PropType<PanoramaPov>, default: undefined },
    zoom: { type: Number, default: undefined },
    options: { type: Object as PropType<PanoramaOptions>, default: undefined },
    visible: { type: Boolean, default: undefined },
    enableScrollWheelZoom: { type: Boolean, default: undefined },
    poiType: { type: String as PropType<PanoramaPOIType>, default: undefined },
    style: { default: undefined },
    className: { type: String, default: undefined },
    onPositionChange: { type: Function as PropType<(point: Point) => void>, default: undefined },
    onPovChange: { type: Function as PropType<() => void>, default: undefined },
    onLinksChange: { type: Function as PropType<() => void>, default: undefined },
    onZoomChange: { type: Function as PropType<(zoom: number) => void>, default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onDblClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onLinkClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onIdChange: { type: Function as PropType<(id: string) => void>, default: undefined },
    onSceneTypeChange: { type: Function as PropType<() => void>, default: undefined },
    onError: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onDataLoad: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any, { slots, expose }) {
    const bmap = useBMapContext();
    const containerRef = shallowRef<HTMLDivElement | null>(null);
    const pano = shallowRef<MapHandle | null>(null);
    provide(PANORAMA_KEY, pano);

    // 创建全景实例
    const create = () => {
      const { status, driver } = bmap.value;
      if (status !== 'ready' || !driver || !containerRef.value || pano.value) return;
      const handle = driver.createPanorama(containerRef.value, props.options ?? {});
      if (!handle) return;
      pano.value = handle;

      const raw = (handle as any).raw;
      if (raw && typeof raw.addEventListener === 'function') {
        raw.addEventListener('position_changed', (e: any) => {
          const pt = e?.point || e?.latlng || e?.latLng || e?.data?.point || e?.data?.latlng || e?.data?.latLng;
          if (pt && typeof pt.lng === 'number') {
            props.onPositionChange?.({ lng: pt.lng, lat: pt.lat });
          } else if (typeof raw.getPosition === 'function') {
            try {
              const pos = raw.getPosition();
              if (pos && typeof pos.lng === 'number') props.onPositionChange?.({ lng: pos.lng, lat: pos.lat });
            } catch { /* ignore */ }
          }
        });
        raw.addEventListener('pov_changed', () => props.onPovChange?.());
        raw.addEventListener('links_changed', () => props.onLinksChange?.());
        raw.addEventListener('zoom_changed', () => {
          let z: number | undefined;
          try { z = raw.getZoom?.(); } catch { /* ignore */ }
          props.onZoomChange?.(z as number);
        });
        raw.addEventListener('click', (e: any) => props.onClick?.(e));
        raw.addEventListener('dblclick', (e: any) => props.onDblClick?.(e));
        raw.addEventListener('link_click', (e: any) => props.onLinkClick?.(e));
        raw.addEventListener('id_changed', (e: any) => {
          let curId: string | undefined = typeof e === 'string' ? e : undefined;
          if (curId === undefined) { try { curId = raw.getId?.(); } catch { /* ignore */ } }
          props.onIdChange?.(curId as string);
        });
        raw.addEventListener('scene_type_changed', () => props.onSceneTypeChange?.());
        raw.addEventListener('pano_error', (e: any) => props.onError?.(e));
        raw.addEventListener('dataload', (e: any) => props.onDataLoad?.(e));
      }
    };

    const destroy = () => {
      const { driver } = bmap.value;
      if (pano.value && driver) { try { driver.destroyPanorama(pano.value); } catch { /* ignore */ } }
      pano.value = null;
    };

    onMounted(() => {
      create();
      watch(() => bmap.value.status, () => create());
    });
    onUnmounted(destroy);

    // 命令式句柄：把原生实例包成 PanoramaRef 暴露出去
    expose({
      getPanoramaRef: (): PanoramaRef | null => {
        const raw = pano.value ? (pano.value as any).raw : null;
        return raw ? new PanoramaRefImpl(raw) : null;
      },
    });

    // point → setPosition
    watch([() => pano.value, () => props.point?.lng, () => props.point?.lat], () => {
      if (!pano.value || !props.point) return;
      const raw = (pano.value as any).raw;
      const SDK = tryGetSDK();
      if (raw && SDK?.Point) {
        try { raw.setPosition?.(new SDK.Point(props.point.lng, props.point.lat)); }
        catch (e) { debugWarn('Panorama.setPosition', e); }
      }
    });
    // id → setId
    watch([() => pano.value, () => props.id], () => {
      if (!pano.value || !props.id) return;
      const raw = (pano.value as any).raw;
      try { raw?.setId?.(props.id); } catch (e) { debugWarn('Panorama.setId', e); }
    });
    // pov → setPov
    watch([() => pano.value, () => props.pov?.heading, () => props.pov?.pitch], () => {
      if (!pano.value || !props.pov) return;
      const raw = (pano.value as any).raw;
      try { raw?.setPov?.({ heading: props.pov.heading, pitch: props.pov.pitch }); }
      catch (e) { debugWarn('Panorama.setPov', e); }
    });
    // zoom → setZoom
    watch([() => pano.value, () => props.zoom], () => {
      if (!pano.value || props.zoom == null) return;
      const raw = (pano.value as any).raw;
      try { raw?.setZoom?.(props.zoom); } catch (e) { debugWarn('Panorama.setZoom', e); }
    });
    // options → setOptions（重复应用同值无副作用）
    watch([() => pano.value, () => (props.options ? JSON.stringify(props.options) : '')], () => {
      if (!pano.value || !props.options) return;
      const raw = (pano.value as any).raw;
      // SDK 坑：albumsControl:false 与 albumsControlOptions 一起下发时，相册的 setOptions
      // 末尾会 renderByPid 把相册重新渲染出来，导致「隐藏」失效。故关闭相册时剔除 albumsControlOptions。
      let toApply: PanoramaOptions = props.options;
      if (props.options.albumsControl === false && props.options.albumsControlOptions !== undefined) {
        const { albumsControlOptions: _drop, ...rest } = props.options;
        void _drop;
        toApply = rest;
      }
      try { raw?.setOptions?.(toApply); } catch (e) { debugWarn('Panorama.setOptions', e); }
    });
    // visible → show / hide
    watch([() => pano.value, () => props.visible], () => {
      if (!pano.value || props.visible === undefined) return;
      const raw = (pano.value as any).raw;
      try { if (props.visible) raw?.show?.(); else raw?.hide?.(); } catch (e) { debugWarn('Panorama.visible', e); }
    });
    // enableScrollWheelZoom → enable/disable
    watch([() => pano.value, () => props.enableScrollWheelZoom], () => {
      if (!pano.value || props.enableScrollWheelZoom === undefined) return;
      const raw = (pano.value as any).raw;
      try { if (props.enableScrollWheelZoom) raw?.enableScrollWheelZoom?.(); else raw?.disableScrollWheelZoom?.(); }
      catch (e) { debugWarn('Panorama.enableScrollWheelZoom', e); }
    });
    // poiType → setPanoramaPOIType
    watch([() => pano.value, () => props.poiType], () => {
      if (!pano.value || !props.poiType) return;
      const raw = (pano.value as any).raw;
      try { raw?.setPanoramaPOIType?.(props.poiType); } catch (e) { debugWarn('Panorama.setPanoramaPOIType', e); }
    });

    return () => h(
      'div',
      { ref: containerRef, class: props.className, style: props.style as StyleValue },
      pano.value ? (slots.default ? slots.default() : []) : [],
    );
  },
});

export interface PanoramaLabelProps {
  position: Point;
  altitude?: number;
  content?: string;
  /** 是否显示标签到当前全景场景点的距离，默认 true */
  displayDistance?: boolean;
  /** 自定义标签 css 样式 */
  customStyle?: StyleValue;
  /** 点击标注回调 */
  onClick?: (e: unknown) => void;
}

export const PanoramaLabel = defineComponent({
  name: 'PanoramaLabel',
  props: {
    position: { type: Object as PropType<Point>, required: true },
    altitude: { type: Number, default: undefined },
    content: { type: String, default: undefined },
    displayDistance: { type: Boolean, default: undefined },
    customStyle: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any) {
    const bmap = useBMapContext();
    const pano = inject(PANORAMA_KEY, null);

    let rawLabel: any = null;
    let clickHandler: ((e: unknown) => void) | null = null;

    const labelKey = () => JSON.stringify([
      props.position, props.altitude, props.content, props.displayDistance, props.customStyle,
    ]);

    const create = () => {
      const driver = bmap.value.driver;
      const panoHandle = pano?.value ?? null;
      if (!driver || !panoHandle) return;
      // createPanoramaLabel 内部拆分参数：PanoramaLabel(content, {position, altitude, displayDistance, customStyle})
      const label: OverlayHandle | null = driver.createPanoramaLabel({
        position: props.position,
        altitude: props.altitude,
        content: props.content,
        displayDistance: props.displayDistance,
        customStyle: props.customStyle,
      });
      if (!label) return;
      rawLabel = (label as any).raw;
      const rawPano = (panoHandle as any).raw;
      if (rawPano && typeof rawPano.addOverlay === 'function') rawPano.addOverlay(rawLabel);
      // 点击事件：通过 props 读最新 handler，换 handler 不必重建
      clickHandler = (e: unknown) => props.onClick?.(e);
      if (rawLabel && typeof rawLabel.addEventListener === 'function') rawLabel.addEventListener('click', clickHandler);
    };

    const destroy = () => {
      const panoHandle = pano?.value ?? null;
      const rawPano = panoHandle ? (panoHandle as any).raw : null;
      if (rawLabel && clickHandler && typeof rawLabel.removeEventListener === 'function') {
        rawLabel.removeEventListener('click', clickHandler);
      }
      if (rawPano && rawLabel && typeof rawPano.removeOverlay === 'function') rawPano.removeOverlay(rawLabel);
      rawLabel = null;
      clickHandler = null;
    };

    const recreate = () => { destroy(); create(); };
    watch([() => bmap.value.driver, () => pano?.value, labelKey], recreate, { immediate: true });
    onUnmounted(destroy);

    return () => null;
  },
});

