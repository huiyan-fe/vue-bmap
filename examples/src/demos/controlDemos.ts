import { defineComponent, h, ref } from 'vue';
import {
  NavigationControl, NavigationControl3D, ScaleControl, OverviewMapControl,
  MapTypeControl, CopyrightControl, GeolocationControl, PanoramaControl,
  ZoomControl, CityListControl, LogoControl,
  CustomControl, RawControl, useDriver,
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

// ─── CustomControl（v1.0.2 新增）：自定义控件 + 联动地图 zoom ───
const CustomControlDemo = defineComponent({
  name: 'CustomControlDemo',
  setup() {
    const zoom = ref(11);
    return () => h(MapContainer, { center: C, zoom: zoom.value }, {
      default: () => [
        h(CustomControl, { anchor: BMAP_ANCHOR_TOP_RIGHT }, {
          default: () => [
            h('div', {
              style: {
                background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
                padding: '6px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', fontSize: '13px',
                display: 'flex', gap: '8px', alignItems: 'center',
              },
            }, [
              h('button', { onClick: () => { zoom.value = Math.min(zoom.value + 1, 19); } }, '放大'),
              h('button', { onClick: () => { zoom.value = Math.max(zoom.value - 1, 3); } }, '缩小'),
              h('span', `zoom=${zoom.value}`),
            ]),
          ],
        }),
      ],
    });
  },
});
registerDemo('custom-control', {
  component: CustomControlDemo,
  code: `<script setup>
import { ref } from 'vue';
import { Map, CustomControl, BMAP_ANCHOR_TOP_RIGHT } from '@baidumap/vue-bmap';

// CustomControl（v1.0.2 新增）：把自定义 DOM 内容挂载到地图固定像素位置，
// 通过内部按钮联动操作地图属性（zoom），演示自定义控件与地图状态的交互。
const zoom = ref(11);
const zoomIn = () => { zoom.value = Math.min(zoom.value + 1, 19); };
const zoomOut = () => { zoom.value = Math.max(zoom.value - 1, 3); };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="zoom">
    <CustomControl :anchor="BMAP_ANCHOR_TOP_RIGHT">
      <div style="background:#fff;border:1px solid #ccc;border-radius:4px;padding:6px 10px;display:flex;gap:8px;align-items:center;">
        <button @click="zoomIn">放大</button>
        <button @click="zoomOut">缩小</button>
        <span>zoom={{ zoom }}</span>
      </div>
    </CustomControl>
  </Map>
</template>`,
});

// ─── RawControl（v1.0.2 新增）：逃生舱，挂载任意继承 Control 的原生实例 ───
const RawControlDemo = defineComponent({
  name: 'RawControlDemo',
  setup() {
    const driver = useDriver();
    const create = () => {
      const rawSDK = driver.value?.rawSDK as any;
      class ActionControl extends rawSDK.Control {
        defaultAnchor: any;
        defaultOffset: any;
        constructor() {
          super();
          this.defaultAnchor = BMAP_ANCHOR_BOTTOM_LEFT;
          this.defaultOffset = new rawSDK.Size(10, 10);
        }
        initialize(map: any) {
          const div = document.createElement('div');
          div.style.cssText = 'padding:6px 12px;background:#1890ff;color:#fff;border-radius:4px;font-size:12px;cursor:pointer;';
          div.textContent = '放大一级';
          div.addEventListener('click', () => map.setZoom(map.getZoom() + 1));
          map.getContainer().appendChild(div);
          return div;
        }
      }
      return new ActionControl();
    };
    return () => (driver.value?.rawSDK ? h(RawControl, { create, deps: [] }) : null);
  },
});
registerDemo('raw-control', {
  component: defineComponent({
    name: 'RawControlPage',
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(RawControlDemo)] }),
  }),
  code: `<script setup>
import { Map, RawControl, useDriver, BMAP_ANCHOR_BOTTOM_LEFT } from '@baidumap/vue-bmap';

// RawControl（v1.0.2 新增）：用户自己写继承 BMap.Control 的类（掌控 initialize/DOM），
// 库负责挂载卸载。driver.rawSDK 就是全局 BMap / BMapGL 命名空间。
const driver = useDriver();
const create = () => {
  const rawSDK = driver.value.rawSDK;
  class ActionControl extends rawSDK.Control {
    constructor() {
      super();
      this.defaultAnchor = BMAP_ANCHOR_BOTTOM_LEFT;
      this.defaultOffset = new rawSDK.Size(10, 10);
    }
    initialize(map) {
      const div = document.createElement('div');
      div.style.cssText = 'padding:6px 12px;background:#1890ff;color:#fff;border-radius:4px;cursor:pointer;';
      div.textContent = '放大一级';
      div.addEventListener('click', () => map.setZoom(map.getZoom() + 1));
      map.getContainer().appendChild(div);
      return div;
    }
  }
  return new ActionControl();
};
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11">
    <RawControl v-if="driver?.rawSDK" :create="create" :deps="[]" />
  </Map>
</template>`,
});
