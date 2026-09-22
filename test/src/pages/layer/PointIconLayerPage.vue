<script setup lang="ts">
/**
 * PointIconLayer 测试页 — v4+。图标点图层。
 * 支持 setData（GeoJSON 数据）、style（图标样式）。
 *
 * 组件方式：
 * <PointIconLayer :style="{ icon: 'url', width: 25, height: 25 }" :data="geojson" />
 */
import { computed, ref } from 'vue';
import { Map, PointIconLayer, useCapabilities } from '@baidumap/vue-bmap';
import type { PointIconStyle } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const ICON_URL = 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png';

const DEMO_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, name: '天安门' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.415, 39.910] }, properties: { id: 2, name: '故宫' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.397, 39.913] }, properties: { id: 3, name: '中山公园' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.417, 39.928] }, properties: { id: 4, name: '北海公园' } },
  ],
};

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PointIconLayer'));

const visible = ref(true);
const isFlat = ref(true);
const isFixed = ref(true);
const iconUrl = ref(ICON_URL);
const width = ref(25);
const height = ref(25);
const scale = ref(1);
const rotation = ref(0);
const opacity = ref(1);

const style = computed<PointIconStyle>(() => ({
  icon: iconUrl.value,
  sizes: [width.value, height.value],
  scale: scale.value,
  rotation: rotation.value,
  opacity: opacity.value,
}));

const resetAll = () => {
  visible.value = true; isFlat.value = true; isFixed.value = true; iconUrl.value = ICON_URL;
  width.value = 25; height.value = 25; scale.value = 1; rotation.value = 0; opacity.value = 1;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <PointIconLayer
          v-if="visible && supported"
          :is-flat="isFlat"
          :is-fixed="isFixed"
          id-key="id"
          :style="style"
          :data="DEMO_DATA"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>PointIconLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。图标点图层，支持贴地/非贴地图标渲染。通过 setData 加载 GeoJSON 数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据</h3>
        <p class="muted small">{{ DEMO_DATA.features.length }} 个点标注（天安门/故宫/中山公园/北海公园）。</p>
      </section>

      <section>
        <h3>isFlat（贴地）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="isFlat" />贴地（重建）</label>
      </section>

      <section>
        <h3>isFixed（固定大小）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="isFixed" />图标不随缩放改变尺寸（重建）</label>
      </section>

      <section>
        <h3>icon（图标 URL）</h3>
        <input type="text" class="full-width" v-model="iconUrl" />
      </section>

      <section>
        <h3>width: {{ width }}px</h3>
        <input type="range" min="5" max="100" :value="width" @input="width = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>height: {{ height }}px</h3>
        <input type="range" min="5" max="100" :value="height" @input="height = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>scale: {{ scale }}</h3>
        <input type="range" min="0.1" max="5" step="0.1" :value="scale" @input="scale = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>rotation: {{ rotation }}°</h3>
        <input type="range" min="0" max="360" :value="rotation" @input="rotation = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">&lt;Map :default-center="center" :default-zoom="14"&gt;
  &lt;PointIconLayer
    is-flat
    is-fixed
    id-key="id"
    :style="{
      icon: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png',
      width: 25,
      height: 25,
      scale: 1,
      rotation: 0,
    }"
    :data="{
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1 } },
      ],
    }"
  /&gt;
&lt;/Map&gt;</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
