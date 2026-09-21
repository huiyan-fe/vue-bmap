<script setup lang="ts">
import { ref, watch } from 'vue';
import { Map, Polyline, useBMapContext, BMap_Symbol_SHAPE_FORWARD_OPEN_ARROW } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const bmap = useBMapContext();
const { eventLog, log } = useLog();
const PATH = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return { lng: 116.34 + t * 0.14, lat: 39.9 + Math.sin(t * Math.PI) * 0.03 }; });
const repeat = ref('8%');
const scale = ref(0.6);
const icons = ref<unknown[]>([]);
const build = () => {
  const d = bmap.value.driver; if (!d) return;
  const symbol = d.createSymbol(BMap_Symbol_SHAPE_FORWARD_OPEN_ARROW, { scale: scale.value, strokeColor: '#fff', strokeWeight: 2 });
  if (!symbol) return;
  // 沿线重复的方向箭头
  const seq = d.createIconSequence(symbol, '0%', repeat.value, true);
  // 末尾固定一个箭头：offset='100%'、repeat='' 只画单个
  const endSeq = d.createIconSequence(symbol, '100%', '', true);
  const list = [seq, endSeq].filter(Boolean);
  if (list.length) icons.value = list;
};
watch([() => bmap.value.driver, repeat, scale], build, { immediate: true });
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <Polyline :key="`${repeat}|${scale}`" :path="PATH" :icons="icons" stroke-color="#1890ff" :stroke-weight="8" :stroke-opacity="0.9" :onClick="() => log('➡️ polyline(iconSeq).click')" />
      </Map>
      <EventLog :log="eventLog" hint="折线上重复的箭头图标序列" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>IconSequence（值对象）</h2>
      <section><h3>说明</h3><p class="muted small">用 driver.createSymbol + createIconSequence 生成，传给 Polyline 的 icons。@deprecated 4.0（纯 GL 下不渲染，建议用 Polyline#strokeTexture）。</p></section>
      <section><h3>repeat（间距）</h3><div class="btn-group"><button v-for="r in ['5%','8%','12%','20%']" :key="r" :class="{ active: repeat === r }" @click="repeat = r">{{ r }}</button></div></section>
      <section><h3>scale: {{ scale.toFixed(2) }}</h3><input class="full-width" type="range" min="0.3" max="1.5" step="0.1" :value="scale" @input="scale = +($event.target as HTMLInputElement).value" /></section>
    </div>
  </div>
</template>
