import { defineComponent, h } from 'vue';
import { TrafficLayer, DistrictLayer, GeoJSONLayer } from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };

// ─── TrafficLayer 交通路况 ───
registerDemo('traffic-layer', {
  component: defineComponent({
    name: 'TrafficLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 13 }, { default: () => [h(TrafficLayer)] }),
  }),
  code: `<Map :center="center" :zoom="13">
  <TrafficLayer />
</Map>`,
});

// ─── DistrictLayer 行政区 ───
registerDemo('district-layer', {
  component: defineComponent({
    name: 'DistrictLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 10 }, {
      default: () => [h(DistrictLayer, {
        name: '北京市', kind: 1,
        strokeColor: '#3388ff', strokeWeight: 2, fillColor: '#3388ff', fillOpacity: 0.15,
      })],
    }),
  }),
  code: `<DistrictLayer name="北京市" :kind="1" strokeColor="#3388ff" :fillOpacity="0.15" />`,
});

// ─── GeoJSONLayer ───
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[116.39, 39.9], [116.42, 39.9], [116.42, 39.93], [116.39, 39.93], [116.39, 39.9]]],
    },
  }],
};
registerDemo('geojson-layer', {
  component: defineComponent({
    name: 'GeoJSONLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(GeoJSONLayer as any, { dataSource: geojson })],
    }),
  }),
  code: `<GeoJSONLayer :dataSource="featureCollection" />`,
});
