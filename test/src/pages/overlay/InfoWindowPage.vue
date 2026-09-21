<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, Marker, InfoWindow, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const open = ref(true);
const title = ref('天安门');
const text = ref('北京市东城区东长安街');
const width = ref(0);
const enableAutoPan = ref(true);
const enableCloseOnClick = ref(true);
const content = computed(() => `<div style="padding:4px">${text.value}</div>`);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <Marker :position="BEIJING" :onClick="() => { open = !open; log('🖱️ marker.click → toggle'); }">
          <InfoWindow
            :open="open" :content="content" :title="title" :width="width"
            :enable-auto-pan="enableAutoPan" :enable-close-on-click="enableCloseOnClick"
            :onOpen="() => log('🪟 open')" :onClose="() => { open = false; log('🪟 close'); }"
          />
        </Marker>
      </Map>
      <EventLog :log="eventLog" hint="点击标注切换信息窗口" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>InfoWindow（全量）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('InfoWindow') ? 'ok' : 'no'}`">InfoWindow</div></div></section>
      <section><h3>open</h3><label class="checkbox-row"><input type="checkbox" v-model="open" />打开信息窗口</label></section>
      <section><h3>title</h3><input class="full-width" type="text" v-model="title" /></section>
      <section><h3>content（HTML）</h3><input class="full-width" type="text" v-model="text" /></section>
      <section><h3>width: {{ width === 0 ? '自适应' : width + 'px' }}</h3><input class="full-width" type="range" min="0" max="400" step="10" :value="width" @input="width = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>行为</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableAutoPan" />enableAutoPan（打开时平移）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enableCloseOnClick" />enableCloseOnClick（点图关闭）</label>
      </section>
      <p class="muted small">嵌在 &lt;Marker&gt; 内自动挂到 marker；独立使用需传 position。</p>
    </div>
  </div>
</template>
