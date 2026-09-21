import { defineComponent, h } from 'vue';
import {
  NavigationControl, NavigationControl3D, ScaleControl, OverviewMapControl,
  MapTypeControl, CopyrightControl, GeolocationControl, PanoramaControl,
  ZoomControl, CityListControl, LogoControl,
  BMAP_ANCHOR_TOP_LEFT, BMAP_ANCHOR_TOP_RIGHT, BMAP_ANCHOR_BOTTOM_LEFT, BMAP_ANCHOR_BOTTOM_RIGHT,
} from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };

/** 生成一个「地图 + 单控件」示例；mapProps 用于 3D 场景的 tilt 等。 */
function ctrlDemo(id: string, name: string, Ctrl: any, anchor: number, anchorName: string, mapProps: Record<string, unknown> = {}) {
  registerDemo(id, {
    component: defineComponent({
      name: `${name}Demo`,
      setup: () => () => h(MapContainer, { center: C, zoom: 11, ...mapProps }, { default: () => [h(Ctrl, { anchor })] }),
    }),
    code: `<script setup>
import { Map, ${name}, ${anchorName} } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11"${mapProps.tilt ? ' :tilt="60"' : ''}>
    <${name} :anchor="${anchorName}" />
  </Map>
</template>`,
  });
}

ctrlDemo('navigation-control', 'NavigationControl', NavigationControl, BMAP_ANCHOR_TOP_LEFT, 'BMAP_ANCHOR_TOP_LEFT');
ctrlDemo('navigation-control-3d', 'NavigationControl3D', NavigationControl3D, BMAP_ANCHOR_TOP_LEFT, 'BMAP_ANCHOR_TOP_LEFT', { tilt: 60 });
ctrlDemo('scale-control', 'ScaleControl', ScaleControl, BMAP_ANCHOR_BOTTOM_LEFT, 'BMAP_ANCHOR_BOTTOM_LEFT');
ctrlDemo('overview-map-control', 'OverviewMapControl', OverviewMapControl, BMAP_ANCHOR_BOTTOM_RIGHT, 'BMAP_ANCHOR_BOTTOM_RIGHT');
ctrlDemo('map-type-control', 'MapTypeControl', MapTypeControl, BMAP_ANCHOR_TOP_RIGHT, 'BMAP_ANCHOR_TOP_RIGHT');
ctrlDemo('geolocation-control', 'GeolocationControl', GeolocationControl, BMAP_ANCHOR_BOTTOM_RIGHT, 'BMAP_ANCHOR_BOTTOM_RIGHT');
ctrlDemo('panorama-control', 'PanoramaControl', PanoramaControl, BMAP_ANCHOR_TOP_LEFT, 'BMAP_ANCHOR_TOP_LEFT');
ctrlDemo('zoom-control', 'ZoomControl', ZoomControl, BMAP_ANCHOR_BOTTOM_RIGHT, 'BMAP_ANCHOR_BOTTOM_RIGHT');
ctrlDemo('city-list-control', 'CityListControl', CityListControl, BMAP_ANCHOR_TOP_LEFT, 'BMAP_ANCHOR_TOP_LEFT');
ctrlDemo('logo-control', 'LogoControl', LogoControl, BMAP_ANCHOR_BOTTOM_LEFT, 'BMAP_ANCHOR_BOTTOM_LEFT');

// ─── CopyrightControl（带自定义版权内容） ───
registerDemo('copyright-control', {
  component: defineComponent({
    name: 'CopyrightControlDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(CopyrightControl, { anchor: BMAP_ANCHOR_BOTTOM_RIGHT, copyrights: [{ id: 1, content: '<span style="color:#666;font-size:12px">© 2026 My App</span>' }] })],
    }),
  }),
  code: `<script setup>
import { Map, CopyrightControl, BMAP_ANCHOR_BOTTOM_RIGHT } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <CopyrightControl :anchor="BMAP_ANCHOR_BOTTOM_RIGHT"
      :copyrights="[{ id: 1, content: '<span>© 2026 My App</span>' }]" />
  </Map>
</template>`,
});
