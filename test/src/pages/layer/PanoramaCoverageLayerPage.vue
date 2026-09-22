<script setup lang="ts">
/**
 * PanoramaCoverageLayer 测试页 — 全景覆盖区域图层。
 * dts 标记 @removed 4.0，但 SDK 运行时仍保留此类。
 * 无参数构造，通过 map.addLayer / map.removeLayer 管理。
 */
import { computed, ref } from 'vue';
import { Map, PanoramaCoverageLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PanoramaCoverageLayer'));
const visible = ref(true);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <PanoramaCoverageLayer v-if="visible && supported" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>PanoramaCoverageLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">
          全景覆盖区域图层。dts 标记 @removed 4.0，但 SDK 运行时仍保留此类。
          展示全景街道覆盖范围，无参数构造。
        </p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <p class="muted small">在支持全景的区域会显示蓝色覆盖层。缩放地图到街道级别可以看到更详细的全景覆盖。</p>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="visible = true">reset</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">&lt;Map :default-center="center" :default-zoom="12"&gt;
  &lt;PanoramaCoverageLayer /&gt;
&lt;/Map&gt;</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
