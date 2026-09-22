<script setup lang="ts">
/**
 * TileLayer 全量测试页 — 覆盖 TileLayer.d.ts + TileLayerOptions.d.ts 全部功能。
 * TileLayer 是全版本共有的瓦片图层。
 * 通过 map.addLayer / map.removeLayer 管理（v4 统一接口）。
 * 所有字段仅 constructor 读取，props 变化时通过 key 重建。
 *
 * 注意：dark/light/midnight 等地图样式不是瓦片 URL 参数，走 map.setMapStyleV2。
 * TileLayer 的 tileUrlTemplate 只用于自定义瓦片服务。
 */
import { computed, ref } from 'vue';
import { Map, TileLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_URL = 'https://maponline0.bdimg.com/tile/?qt=tile&x={X}&y={Y}&z={Z}&styles=pl&scaler=1&udt=20230815';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TileLayer'));

const visible = ref(true);
const url = ref(DEFAULT_URL);
const transparentPng = ref(false);
const opacity = ref(1);
const zIndex = ref<number | undefined>(undefined);
const retry = ref(false);
const retryTime = ref<number | undefined>(300);
const cacheSize = ref<number | undefined>(undefined);

// 所有字段 constructor-only，变化时用 key 重建
const rebuildKey = computed(() => `${url.value}|${transparentPng.value}|${opacity.value}|${zIndex.value ?? ''}|${retry.value}|${retryTime.value ?? ''}|${cacheSize.value ?? ''}`);

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const currentProps = computed(() => JSON.stringify({
  tileUrlTemplate: url.value,
  transparentPng: transparentPng.value || undefined,
  opacity: opacity.value !== 1 ? opacity.value : undefined,
  zIndex: zIndex.value,
  retry: retry.value || undefined,
  retryTime: retryTime.value,
  cacheSize: cacheSize.value,
}, null, 2));

const reset = () => {
  visible.value = true;
  url.value = DEFAULT_URL;
  transparentPng.value = false;
  opacity.value = 1;
  zIndex.value = undefined;
  retry.value = false;
  retryTime.value = 300;
  cacheSize.value = undefined;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <TileLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :tile-url-template="url"
          :transparent-png="transparentPng || undefined"
          :opacity="opacity !== 1 ? opacity : undefined"
          :z-index="zIndex"
          :retry="retry || undefined"
          :retry-time="retryTime"
          :cache-size="cacheSize"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>TileLayer（全量）</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。瓦片图层，所有字段仅在 constructor 读取，变化时重建。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>tileUrlTemplate</h3>
        <textarea class="full-width" rows="2" v-model="url"></textarea>
        <p class="muted small">瓦片 URL 模板，占位符 {X}/{Y}/{Z}。变化时重建图层。</p>
      </section>

      <section>
        <h3>transparentPng</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="transparentPng" />透明 PNG（重建）</label>
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = Number(($event.target as HTMLInputElement).value)" class="full-width" />
        <p class="muted small">透明度 0-1，变化时重建</p>
      </section>

      <section>
        <h3>zIndex</h3>
        <input type="number" placeholder="未设置" :value="zIndex ?? ''" @input="zIndex = numOrUndef(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>retry / retryTime</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="retry" />retry（加载失败重试，重建）</label>
        <label class="checkbox-row">retryTime (ms)
          <input type="number" placeholder="300" :value="retryTime ?? ''" @input="retryTime = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section>
        <h3>cacheSize</h3>
        <input type="number" placeholder="未设置" :value="cacheSize ?? ''" @input="cacheSize = numOrUndef(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>预设</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="reset">reset all</button>
          <button style="font-size:11px" @click="transparentPng = true; opacity = 0.7">透明叠加</button>
          <button style="font-size:11px" @click="retry = true; retryTime = 500">重试模式</button>
          <button style="font-size:11px" @click="opacity = 0.5; zIndex = 5">半透明高优</button>
        </div>
      </section>

      <section>
        <h3>当前 Props</h3>
        <pre class="code-sample">{{ currentProps }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
