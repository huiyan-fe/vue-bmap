import { defineComponent, h, onMounted, reactive, ref } from 'vue';
import {
  useLocalSearch, useGeocoder, useDrivingRoute, useWalkingRoute,
  useRidingRoute, useTransitRoute, useBusLineSearch, useAutocomplete,
  useBoundary, useGeolocation, useLocalCity, usePlaceDetail,
  useConvertor, usePanoramaService, useTruckRoute,
} from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };

// 浮层面板样式（与 react-bmap serviceDemos 的 panelStyle 一致）
const panelStyle = {
  position: 'absolute', top: '10px', left: '10px', zIndex: 10,
  background: '#fff', padding: '12px', borderRadius: '6px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxWidth: '320px', fontSize: '13px',
} as const;
const inputStyle = { flex: 1, padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' } as const;
const fullInputStyle = { width: '100%', marginBottom: '4px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' } as const;
const btnStyle = { padding: '4px 12px', border: '1px solid #1890ff', background: '#1890ff', color: '#fff', borderRadius: '4px', cursor: 'pointer' } as const;
const resultStyle = { marginTop: '6px', color: '#666', wordBreak: 'break-all' } as const;
const svcPanelStyle = { marginTop: '6px', minHeight: '40px', maxHeight: '240px', overflow: 'auto', fontSize: '12px' } as const;

const parsePoint = (s: string) => { const [lng, lat] = s.split(',').map(Number); return { lng, lat }; };
const fmt = (v: unknown, n = 200) => {
  try { return JSON.stringify(v, (_k, val) => (typeof val === 'function' ? '<fn>' : val)).slice(0, n); }
  catch { return String(v); }
};
// 阻断结果面板滚轮冒泡到地图（避免滚动面板触发地图缩放）
const blockWheel = (el: HTMLElement | null) => {
  if (el) el.addEventListener('wheel', (e) => e.stopPropagation());
};

// 单按钮路线规划内部组件工厂（驾车/步行/骑行/货车共用）：hook 必须在 <Map> 内部调用
function makeRouteButtonInner(useRoute: (opts: any) => any, from: string, to: string, label: string, color: string) {
  return defineComponent({
    name: 'RouteButtonInner',
    setup() {
      const panelRef = ref<HTMLElement | null>(null);
      const options = reactive({ location: '北京' as unknown, renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true } });
      const r = useRoute(options as any);
      onMounted(() => { options.renderOptions.panel = panelRef.value ?? undefined; blockWheel(panelRef.value); });
      const btn = { width: '100%', padding: '6px', border: `1px solid ${color}`, background: color, color: '#fff', borderRadius: '4px', cursor: 'pointer' };
      return () => h('div', { style: panelStyle }, [
        h('button', { style: btn, onClick: () => r.search(parsePoint(from), parsePoint(to)) }, r.loading.value ? '搜索中...' : label),
        h('div', { ref: panelRef, style: svcPanelStyle }),
      ]);
    },
  });
}

// ─── useLocalSearch ───
const LocalSearchInner = defineComponent({
  name: 'LocalSearchInner',
  setup() {
    const query = ref('餐厅');
    const panelRef = ref<HTMLElement | null>(null);
    const options = reactive({ location: '北京' as unknown, renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true } });
    const r = useLocalSearch(options as any);
    onMounted(() => { options.renderOptions.panel = panelRef.value ?? undefined; blockWheel(panelRef.value); });
    return () => h('div', { style: panelStyle }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: query.value, style: inputStyle,
          onInput: (e: any) => { query.value = e.target.value; },
          onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') r.search(query.value); },
        }),
        h('button', { style: btnStyle, onClick: () => r.search(query.value) }, r.loading.value ? '...' : '搜索'),
      ]),
      h('div', { ref: panelRef, style: svcPanelStyle }),
    ]);
  },
});
registerDemo('local-search', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(LocalSearchInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useLocalSearch } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useLocalSearch({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search('餐厅');
<\/script>`,
});

// ─── useGeocoder ───
const GeocoderInner = defineComponent({
  name: 'GeocoderInner',
  setup() {
    const addr = ref('天安门');
    const { data, loading, error, getPoint } = useGeocoder();
    const resultText = () => {
      if (error.value) return `❌ ${error.value.message}`;
      if (data.value) return fmt(data.value, 300);
      return '输入地址';
    };
    return () => h('div', { style: panelStyle }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: addr.value, style: inputStyle,
          onInput: (e: any) => { addr.value = e.target.value; },
          onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') getPoint(addr.value); },
        }),
        h('button', { style: btnStyle, onClick: () => getPoint(addr.value) }, loading.value ? '...' : '编码'),
      ]),
      h('div', { style: { marginTop: '6px', color: error.value ? '#f5222d' : '#666', wordBreak: 'break-all' } }, resultText()),
    ]);
  },
});
registerDemo('geocoder', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(GeocoderInner)] }),
  }),
  code: `<script setup>
import { useGeocoder } from '@baidumap/vue-bmap';
const { data, getPoint } = useGeocoder();
getPoint('天安门'); // 地址 → 坐标
<\/script>`,
});

// ─── useDrivingRoute ───
registerDemo('driving-route', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(makeRouteButtonInner(useDrivingRoute, '116.404,39.915', '116.501,39.937', '驾车：天安门 → 国贸', '#1890ff'))],
    }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useDrivingRoute } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useDrivingRoute({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.501, lat: 39.937 });
<\/script>`,
});

// ─── useWalkingRoute ───
registerDemo('walking-route', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(makeRouteButtonInner(useWalkingRoute, '116.404,39.915', '116.417,39.928', '步行：天安门 → 北海公园', '#52c41a'))],
    }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useWalkingRoute } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useWalkingRoute({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.417, lat: 39.928 });
<\/script>`,
});

// ─── useRidingRoute ───
registerDemo('riding-route', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(makeRouteButtonInner(useRidingRoute, '116.404,39.915', '116.45,39.93', '骑行：天安门 → 朝阳门', '#722ed1'))],
    }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useRidingRoute } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useRidingRoute({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.45, lat: 39.93 });
<\/script>`,
});

// ─── useTransitRoute ───
const TransitRouteInner = defineComponent({
  name: 'TransitRouteInner',
  setup() {
    const from = ref('116.404,39.915');
    const to = ref('116.326,39.989');
    const panelRef = ref<HTMLElement | null>(null);
    const options = reactive({ location: '北京' as unknown, renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true } });
    const r = useTransitRoute(options as any);
    onMounted(() => { options.renderOptions.panel = panelRef.value ?? undefined; blockWheel(panelRef.value); });
    return () => h('div', { style: panelStyle }, [
      h('input', { value: from.value, placeholder: '起点 lng,lat', style: fullInputStyle, onInput: (e: any) => { from.value = e.target.value; } }),
      h('input', { value: to.value, placeholder: '终点 lng,lat', style: fullInputStyle, onInput: (e: any) => { to.value = e.target.value; } }),
      h('button', {
        style: { width: '100%', padding: '4px', border: '1px solid #fa8c16', background: '#fa8c16', color: '#fff', borderRadius: '4px', cursor: 'pointer' },
        onClick: () => r.search(parsePoint(from.value), parsePoint(to.value)),
      }, r.loading.value ? '搜索中...' : '公交路线'),
      h('div', { ref: panelRef, style: svcPanelStyle }),
    ]);
  },
});
registerDemo('transit-route', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(TransitRouteInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useTransitRoute } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useTransitRoute({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.326, lat: 39.989 });
<\/script>`,
});

// ─── useBusLineSearch ───
const BusLineInner = defineComponent({
  name: 'BusLineInner',
  setup() {
    const line = ref('1路');
    const panelRef = ref<HTMLElement | null>(null);
    const options = reactive({ location: '北京' as unknown, renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true } });
    const r = useBusLineSearch(options as any);
    onMounted(() => { if (options.renderOptions) options.renderOptions.panel = panelRef.value ?? undefined; blockWheel(panelRef.value); });
    return () => h('div', { style: panelStyle }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: line.value, placeholder: '公交线路', style: inputStyle,
          onInput: (e: any) => { line.value = e.target.value; },
          onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') r.getBusList(line.value); },
        }),
        h('button', { style: btnStyle, onClick: () => r.getBusList(line.value) }, r.loading.value ? '...' : '查询'),
      ]),
      h('div', { style: resultStyle }, r.data.value ? '有结果' : '输入线路名'),
      h('div', { ref: panelRef, style: svcPanelStyle }),
    ]);
  },
});
registerDemo('bus-line-search', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(BusLineInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useBusLineSearch } from '@baidumap/vue-bmap';
const { data, getBusList } = useBusLineSearch({ location: '北京' });
getBusList('1路');
<\/script>`,
});

// ─── useAutocomplete ───
const AutocompleteInner = defineComponent({
  name: 'AutocompleteInner',
  setup() {
    const inputRef = ref<HTMLElement | null>(null);
    const options = reactive({ location: '北京' as unknown, input: undefined as HTMLElement | undefined });
    const r = useAutocomplete(options as any);
    onMounted(() => { options.input = inputRef.value ?? undefined; });
    return () => h('div', { style: panelStyle }, [
      h('input', { ref: inputRef, placeholder: '输入关键词...', style: { width: '100%', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' } }),
      h('div', { style: resultStyle }, r.data.value ? '有建议' : '输入触发自动补全'),
    ]);
  },
});
registerDemo('autocomplete', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(AutocompleteInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useAutocomplete } from '@baidumap/vue-bmap';
const { data } = useAutocomplete({ location: '北京', input: inputEl });
<\/script>`,
});

// ─── useBoundary ───
const BoundaryInner = defineComponent({
  name: 'BoundaryInner',
  setup() {
    const name = ref('北京市');
    const { data, loading, get } = useBoundary();
    return () => h('div', { style: panelStyle }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: name.value, style: inputStyle,
          onInput: (e: any) => { name.value = e.target.value; },
          onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') get(name.value); },
        }),
        h('button', { style: btnStyle, onClick: () => get(name.value) }, loading.value ? '...' : '查询'),
      ]),
      h('div', { style: resultStyle }, data.value ? fmt(data.value, 300) : '输入行政区名'),
    ]);
  },
});
registerDemo('boundary', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 8 }, { default: () => [h(BoundaryInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useBoundary } from '@baidumap/vue-bmap';
const { data, get } = useBoundary();
get('北京市');
<\/script>`,
});

// ─── useGeolocation ───
const GeolocationInner = defineComponent({
  name: 'GeolocationInner',
  setup() {
    const { data, loading, getCurrentPosition } = useGeolocation();
    return () => h('div', { style: panelStyle }, [
      h('button', { style: btnStyle, onClick: () => getCurrentPosition() }, loading.value ? '定位中...' : '获取当前位置'),
      h('div', { style: resultStyle }, data.value ? fmt(data.value, 200) : '点击按钮定位'),
    ]);
  },
});
registerDemo('geolocation', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(GeolocationInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useGeolocation } from '@baidumap/vue-bmap';
const { data, getCurrentPosition } = useGeolocation();
getCurrentPosition();
<\/script>`,
});

// ─── useLocalCity ───
const LocalCityInner = defineComponent({
  name: 'LocalCityInner',
  setup() {
    const { data, loading, get } = useLocalCity();
    return () => h('div', { style: panelStyle }, [
      h('button', { style: btnStyle, onClick: () => get() }, loading.value ? '查询中...' : '获取当前城市'),
      h('div', { style: resultStyle }, data.value ? fmt(data.value, 200) : '点击按钮查询'),
    ]);
  },
});
registerDemo('local-city', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 10 }, { default: () => [h(LocalCityInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useLocalCity } from '@baidumap/vue-bmap';
const { data, get } = useLocalCity();
get();
<\/script>`,
});

// ─── usePlaceDetail ───
const PlaceDetailInner = defineComponent({
  name: 'PlaceDetailInner',
  setup() {
    const uid = ref('06d2dffda107b0ef89f15db6');
    const containerRef = ref<HTMLElement | null>(null);
    const options = reactive({ container: undefined as HTMLElement | undefined });
    const r = usePlaceDetail(options as any);
    onMounted(() => { options.container = containerRef.value ?? undefined; blockWheel(containerRef.value); });
    return () => h('div', { style: { ...panelStyle, maxWidth: '500px' } }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: uid.value, placeholder: 'POI UID', style: inputStyle,
          onInput: (e: any) => { uid.value = e.target.value; },
        }),
        h('button', { style: btnStyle, onClick: () => r.render(uid.value) }, r.loading.value ? '...' : '详情'),
      ]),
      h('div', { ref: containerRef, style: { ...svcPanelStyle, width: '400px', maxHeight: '250px' } }),
    ]);
  },
});
registerDemo('place-detail', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(PlaceDetailInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { usePlaceDetail } from '@baidumap/vue-bmap';
const { data, render } = usePlaceDetail({ container: containerEl });
render('06d2dffda107b0ef89f15db6');
<\/script>`,
});

// ─── useConvertor ───
const ConvertorInner = defineComponent({
  name: 'ConvertorInner',
  setup() {
    const lng = ref('116.404');
    const lat = ref('39.915');
    const { data, loading, translate } = useConvertor();
    return () => h('div', { style: panelStyle }, [
      h('input', { value: lng.value, placeholder: '经度', style: fullInputStyle, onInput: (e: any) => { lng.value = e.target.value; } }),
      h('input', { value: lat.value, placeholder: '纬度', style: fullInputStyle, onInput: (e: any) => { lat.value = e.target.value; } }),
      h('button', {
        style: { width: '100%', padding: '4px', border: '1px solid #1890ff', background: '#1890ff', color: '#fff', borderRadius: '4px', cursor: 'pointer' },
        onClick: () => translate([{ lng: Number(lng.value), lat: Number(lat.value) }], 1, 5),
      }, loading.value ? '转换中...' : 'GPS → 百度坐标'),
      h('div', { style: resultStyle }, data.value ? fmt(data.value, 200) : '输入坐标'),
    ]);
  },
});
registerDemo('convertor', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(ConvertorInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useConvertor } from '@baidumap/vue-bmap';
const { data, translate } = useConvertor();
translate([{ lng: 116.404, lat: 39.915 }], 1, 5); // GPS → 百度
<\/script>`,
});

// ─── usePanoramaService ───
const PanoramaServiceInner = defineComponent({
  name: 'PanoramaServiceInner',
  setup() {
    const { data, loading, getPanoramaByLocation } = usePanoramaService();
    return () => h('div', { style: panelStyle }, [
      h('button', { style: btnStyle, onClick: () => getPanoramaByLocation(C, 100) }, loading.value ? '查询中...' : '获取全景数据'),
      h('div', { style: resultStyle }, data.value ? fmt(data.value, 200) : '点击按钮查询'),
    ]);
  },
});
registerDemo('panorama-service', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(PanoramaServiceInner)] }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { usePanoramaService } from '@baidumap/vue-bmap';
const { data, getPanoramaByLocation } = usePanoramaService();
getPanoramaByLocation({ lng: 116.404, lat: 39.915 }, 100);
<\/script>`,
});

// ─── useTruckRoute ───
registerDemo('truck-route', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(makeRouteButtonInner(useTruckRoute, '116.404,39.915', '116.501,39.937', '货车：天安门 → 国贸', '#fa541c'))],
    }),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { useTruckRoute } from '@baidumap/vue-bmap';
// 在 <Map> 内部：renderOptions 不用传 map，hook 自动取当前地图
const { search } = useTruckRoute({
  location: '北京',
  renderOptions: { panel: panelEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.501, lat: 39.937 });
<\/script>`,
});
