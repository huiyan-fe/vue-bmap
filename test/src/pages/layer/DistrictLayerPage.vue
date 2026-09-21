<script setup lang="ts">
import { computed, ref } from 'vue';
import { Map, DistrictLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const PRESETS = [
  { name: '北京市', strokeColor: '#1890ff', fillColor: '#1890ff33' },
  { name: '上海市', strokeColor: '#52c41a', fillColor: '#52c41a33' },
  { name: '广东省', strokeColor: '#fa8c16', fillColor: '#fa8c1633' },
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('DistrictLayer'));
const visible = ref(true);
const presetIdx = ref(0);
const preset = computed(() => PRESETS[presetIdx.value]);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="8" style="height:100%">
        <DistrictLayer
          v-if="visible && supported"
          :key="preset.name"
          :name="preset.name"
          :stroke-color="preset.strokeColor"
          :fill-color="preset.fillColor"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>DistrictLayer</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。行政区划图层，通过 map.addLayer / map.removeLayer 管理。v3 不支持。</p>
      </section>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>
      <section>
        <h3>预设区域</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(p, i) in PRESETS" :key="p.name" :class="{ active: presetIdx === i }" style="font-size:11px" @click="presetIdx = i">
            {{ p.name }}
          </button>
        </div>
        <p class="muted small">name 变化时通过 key 重建图层</p>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">&lt;Map :default-center="center" :default-zoom="8"&gt;
  &lt;DistrictLayer name="北京市" stroke-color="#1890ff" fill-color="#1890ff33" /&gt;
&lt;/Map&gt;</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
