<script setup lang="ts">
/**
 * XYZLayer 测试页 — v4+。XYZ 瓦片图层。
 * 适用于标准 XYZ 瓦片 URL（如 OpenStreetMap、天地图等）。
 * 支持 tileUrlTemplate（[z]/[x]/[y] 占位符）和 tms 模式。
 */
import { computed, ref } from 'vue';
import { Map, XYZLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const TILE_PRESETS = [
  { label: 'OSM 地图', url: 'https://tile.openstreetmap.org/[z]/[x]/[y].png' },
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('XYZLayer'));
const visible = ref(true);
const url = ref(TILE_PRESETS[0].url);
const opacity = ref(1);
const tms = ref(false);
const minZoom = ref<number | undefined>(undefined);
const maxZoom = ref<number | undefined>(undefined);

const rebuildKey = computed(() => `${url.value}|${opacity.value}|${tms.value}|${minZoom.value ?? ''}|${maxZoom.value ?? ''}`);

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="6">
  <XYZLayer
    tile-url-template="https://tile.openstreetmap.org/[z]/[x]/[y].png"
    :opacity="0.8"
    :min-zoom="3"
    :max-zoom="18"
  />
</Map>`;

const resetAll = () => {
  visible.value = true; url.value = TILE_PRESETS[0].url; opacity.value = 1;
  tms.value = false; minZoom.value = undefined; maxZoom.value = undefined;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="6" style="height:100%">
        <XYZLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :tile-url-template="url"
          :opacity="opacity !== 1 ? opacity : undefined"
          :tms="tms || undefined"
          :min-zoom="minZoom"
          :max-zoom="maxZoom"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>XYZLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。XYZ 瓦片图层，支持标准 XYZ 瓦片 URL。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>tileUrlTemplate</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(p, i) in TILE_PRESETS" :key="i" :class="{ active: url === p.url }" style="font-size:11px" @click="url = p.url">
            {{ p.label }}
          </button>
        </div>
        <textarea class="full-width" rows="2" v-model="url"></textarea>
        <p class="muted small">占位符：[z]/[x]/[y] 或 {z}/{x}/{y}。变化时重建图层。</p>
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = Number(($event.target as HTMLInputElement).value)" class="full-width" />
      </section>

      <section>
        <h3>tms</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="tms" />tms（Y 轴翻转，重建）</label>
        <p class="muted small">TMS 服务的 Y 坐标从下往上，XYZ 从上往下。勾选后自动翻转 Y。</p>
      </section>

      <section>
        <h3>缩放范围</h3>
        <label class="checkbox-row">minZoom
          <input type="number" placeholder="未设置" :value="minZoom ?? ''" @input="minZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row">maxZoom
          <input type="number" placeholder="未设置" :value="maxZoom ?? ''" @input="maxZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
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
