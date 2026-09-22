<script setup lang="ts">
/**
 * RasterTileLayer 测试页 — v4+。栅格瓦片图层。
 */
import { computed, ref } from 'vue';
import { Map, RasterTileLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_URL = 'https://maponline0.bdimg.com/tile/?qt=tile&x={X}&y={Y}&z={Z}&styles=pl&scaler=1&udt=20230815';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('RasterTileLayer'));
const visible = ref(true);
const url = ref(DEFAULT_URL);
const opacity = ref(1);

const rebuildKey = computed(() => `${url.value}|${opacity.value}`);

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="11">
  <RasterTileLayer url="https://yourhost/tile/{x}/{y}/{z}.png" />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <RasterTileLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :url="url"
          :opacity="opacity !== 1 ? opacity : undefined"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>RasterTileLayer</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。栅格瓦片图层。v3 不支持。</p>
      </section>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>
      <section>
        <h3>url（必填）</h3>
        <textarea class="full-width" rows="2" v-model="url"></textarea>
        <p class="muted small">瓦片 URL 或模板函数，占位符 {X}/{Y}/{Z}。变化时重建。</p>
      </section>
      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = Number(($event.target as HTMLInputElement).value)" class="full-width" />
      </section>
      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">{{ CODE_SAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
