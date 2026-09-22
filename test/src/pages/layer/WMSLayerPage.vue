<script setup lang="ts">
/**
 * WMSLayer 测试页 — v4+。WMS 标准服务图层。
 * 需要 url + params（LAYERS 等必填）。
 */
import { computed, ref } from 'vue';
import { Map, WMSLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_URL = 'https://mrdata.usgs.gov/services/mrds';
const DEFAULT_PARAMS = { LAYERS: 'mrds', FORMAT: 'image/png', TRANSPARENT: 'true' };

const caps = useCapabilities();
const supported = computed(() => caps.value.has('WMSLayer'));
const visible = ref(true);
const url = ref(DEFAULT_URL);
const paramsStr = ref(JSON.stringify(DEFAULT_PARAMS, null, 2));
const opacity = ref(1);

const params = computed<Record<string, string> | undefined>(() => {
  try { return JSON.parse(paramsStr.value); } catch { return undefined; }
});

const rebuildKey = computed(() => `${url.value}|${paramsStr.value}|${opacity.value}`);

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="6">
  <WMSLayer
    url="https://mrdata.usgs.gov/services/mrds"
    :params="{ LAYERS: 'mrds', FORMAT: 'image/png', TRANSPARENT: 'true' }"
    :opacity="0.8"
  />
</Map>`;

const resetAll = () => {
  url.value = DEFAULT_URL;
  paramsStr.value = JSON.stringify(DEFAULT_PARAMS, null, 2);
  opacity.value = 1;
  visible.value = true;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="6" style="height:100%">
        <WMSLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :url="url"
          :params="params"
          :opacity="opacity !== 1 ? opacity : undefined"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>WMSLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。WMS 标准服务图层。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>url（WMS 服务地址）</h3>
        <input type="text" class="full-width" v-model="url" />
      </section>

      <section>
        <h3>params（WMS 参数 JSON）</h3>
        <textarea class="full-width" rows="5" v-model="paramsStr"></textarea>
        <p class="muted small">LAYERS 必填。其他常用：FORMAT、TRANSPARENT、VERSION 等。</p>
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = Number(($event.target as HTMLInputElement).value)" class="full-width" />
      </section>

      <section>
        <h3>预设</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
        <p class="muted small">
          ⚠️ WMS 服务必须配置 CORS（Access-Control-Allow-Origin）才能从浏览器加载瓦片。
          大多数公共 WMS 服务（USGS、OSM 等）不开 CORS，会报 net::ERR_FAILED。
          需要填自己部署的、已配置 CORS 的 WMS 服务地址。
        </p>
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
