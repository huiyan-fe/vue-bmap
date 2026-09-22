<script setup lang="ts">
/** MapMask 测试页 */
import { computed, ref } from 'vue';
import { Map, MapMask, useCapabilities } from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

// 不规则多边形遮罩路径（三角形示例）
const TRIANGLE: Point[] = [
  { lng: 116.36, lat: 39.92 },
  { lng: 116.44, lat: 39.92 },
  { lng: 116.40, lat: 39.96 },
];

const BOUNDS = { sw: { lng: 116.38, lat: 39.90 }, ne: { lng: 116.42, lat: 39.93 } };

const caps = useCapabilities();
const showRegion = ref<'inside' | 'outside'>('outside');
const mode = ref<'bounds' | 'points'>('bounds');

const codeSample = computed(() => (mode.value === 'points'
  ? `<MapMask :points="triangle" show-region="${showRegion.value}" is-building-mask is-poi-mask is-map-mask />`
  : `<MapMask :bounds="bounds" show-region="${showRegion.value}" is-building-mask is-poi-mask is-map-mask />`));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <MapMask v-if="caps.has('Map.setHeading') && mode === 'bounds'" :bounds="BOUNDS" :show-region="showRegion" is-building-mask is-poi-mask is-map-mask />
        <MapMask v-if="caps.has('Map.setHeading') && mode === 'points'" :points="TRIANGLE" :show-region="showRegion" is-building-mask is-poi-mask is-map-mask />
      </Map>
    </div>
    <div class="test-controls">
      <h2>MapMask</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${caps.has('Map.setHeading') ? 'ok' : 'no'}`">{{ caps.has('Map.setHeading') ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。区域掩膜。</p>
      </section>
      <section>
        <h3>区域来源</h3>
        <div class="btn-group">
          <button :class="mode === 'bounds' ? 'active' : ''" @click="mode = 'bounds'">bounds（矩形）</button>
          <button :class="mode === 'points' ? 'active' : ''" @click="mode = 'points'">points（多边形）</button>
        </div>
      </section>
      <section>
        <h3>showRegion</h3>
        <div class="btn-group">
          <button :class="showRegion === 'outside' ? 'active' : ''" @click="showRegion = 'outside'">outside（遮罩外部）</button>
          <button :class="showRegion === 'inside' ? 'active' : ''" @click="showRegion = 'inside'">inside（遮罩内部）</button>
        </div>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ codeSample }}</pre>
      </section>
    </div>
  </div>
</template>
