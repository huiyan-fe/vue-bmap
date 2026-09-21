<script setup lang="ts">
import { computed, ref } from 'vue';
import { Map, TrafficLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_COLORS = ['#00ff00', '#ffff00', '#ff8800', '#ff0000'];
const TRAFFIC_LABELS = ['畅通', '缓行', '拥堵', '严重'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TrafficLayer'));
const isV4 = computed(() => caps.value.has('Map.setHeading'));

const visible = ref(true);
const autoRefresh = ref(true);
const refreshInterval = ref(300000);
const colors = ref<string[]>([...DEFAULT_COLORS]);
const edge = ref(true);

const setColor = (i: number, v: string) => { const next = [...colors.value]; next[i] = v; colors.value = next; };
const resetAll = () => {
  visible.value = true; autoRefresh.value = true; refreshInterval.value = 300000;
  colors.value = [...DEFAULT_COLORS]; edge.value = true;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <TrafficLayer
          v-if="visible && supported"
          :auto-refresh="autoRefresh"
          :refresh-interval="refreshInterval"
          :colors="isV4 ? colors : undefined"
          :edge="isV4 ? edge : undefined"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>TrafficLayer</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。路况图层，继承 TileLayer。v4 通过 map.addLayer / map.removeLayer 管理。</p>
      </section>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>
      <section>
        <h3>constructor 选项</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="autoRefresh" />autoRefresh（自动刷新，v4）</label>
        <label class="checkbox-row">refreshInterval (ms)
          <input type="number" :value="refreshInterval" @input="refreshInterval = +($event.target as HTMLInputElement).value" />
        </label>
        <p class="muted small">变化时重建图层（Vue 用通用图层工厂，属性变更即重建）</p>
      </section>
      <template v-if="isV4">
        <section>
          <h3>colors（v4+，构造时应用）</h3>
          <p class="muted small">路况颜色：畅通、缓行、拥堵、严重拥堵</p>
          <div v-for="(c, i) in colors" :key="i" style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:11px;width:60px">{{ TRAFFIC_LABELS[i] }}</span>
            <input type="color" :value="c" @input="setColor(i, ($event.target as HTMLInputElement).value)" />
            <code style="font-size:11px">{{ c }}</code>
          </div>
        </section>
        <section>
          <h3>edge（v4+，构造时应用）</h3>
          <label class="checkbox-row"><input type="checkbox" v-model="edge" />显示白边（路况描边）</label>
        </section>
      </template>
      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">&lt;Map :default-center="center" :default-zoom="12"&gt;
  &lt;TrafficLayer :auto-refresh="true" :refresh-interval="300000"
    :colors="['#00ff00','#ffff00','#ff8800','#ff0000']" :edge="true" /&gt;
&lt;/Map&gt;</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
