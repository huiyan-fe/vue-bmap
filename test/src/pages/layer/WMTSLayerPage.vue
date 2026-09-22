<script setup lang="ts">
/**
 * WMTSLayer 测试页 — v4+。WMTS 标准瓦片矩阵服务图层。
 * 需要 url + params（LAYER / TILEMATRIXSET 等必填）。
 * 和 WMSLayer 一样受 CORS 限制。
 */
import { computed, ref } from 'vue';
import { Map, WMTSLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_URL = '';
const DEFAULT_PARAMS = '{\n  "LAYER": "",\n  "TILEMATRIXSET": "",\n  "FORMAT": "image/png",\n  "TRANSPARENT": "true"\n}';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('WMTSLayer'));
const visible = ref(true);
const url = ref(DEFAULT_URL);
const paramsStr = ref(DEFAULT_PARAMS);
const opacity = ref(1);

const params = computed<Record<string, string> | undefined>(() => {
  try { return JSON.parse(paramsStr.value); } catch { return undefined; }
});

const rebuildKey = computed(() => `${url.value}|${paramsStr.value}|${opacity.value}`);

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="6">
  <WMTSLayer
    url="https://your-wmts-server/wmts"
    :params="{
      LAYER: 'your_layer',
      TILEMATRIXSET: 'default',
      FORMAT: 'image/png',
      TRANSPARENT: 'true',
    }"
    :opacity="0.8"
  />
</Map>`;

const resetAll = () => { visible.value = true; url.value = DEFAULT_URL; paramsStr.value = DEFAULT_PARAMS; opacity.value = 1; };
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="6" style="height:100%">
        <WMTSLayer
          v-if="visible && supported && url && params"
          :key="rebuildKey"
          :url="url"
          :params="params"
          :opacity="opacity !== 1 ? opacity : undefined"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>WMTSLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。WMTS 标准瓦片矩阵服务图层。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>url（WMTS 服务地址）</h3>
        <input type="text" class="full-width" placeholder="https://your-wmts-server/wmts" v-model="url" />
      </section>

      <section>
        <h3>params（WMTS 参数 JSON）</h3>
        <textarea class="full-width" rows="5" v-model="paramsStr"></textarea>
        <p class="muted small">LAYER 和 TILEMATRIXSET 必填。其他：FORMAT、TRANSPARENT、VERSION 等。</p>
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = Number(($event.target as HTMLInputElement).value)" class="full-width" />
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>说明</h3>
        <p class="muted small">
          ⚠️ WMTS 服务必须配置 CORS 才能从浏览器加载瓦片。
          大多数公共 WMTS 服务不开 CORS，会报 net::ERR_FAILED。
          需要填自己部署的、已配置 CORS 的 WMTS 服务地址。
          WMTS 与 WMS 的区别：WMTS 是预切好的静态瓦片（快），WMS 是服务端实时渲染（慢）。
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
