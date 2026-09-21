<script setup lang="ts">
import { ref } from 'vue';
import { Map, GroundOverlay, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const opacity = ref(0.8);
const visible = ref(true);
const bounds = { sw: { lng: 116.35, lat: 39.88 }, ne: { lng: 116.46, lat: 39.95 } };
const url = 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png';
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <GroundOverlay
          :bounds="bounds" :url="url" :opacity="opacity" :visible="visible"
          :onClick="() => log('🖼️ groundOverlay.click')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与地面叠加层交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>GroundOverlay（全量）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('GroundOverlay') ? 'ok' : 'no'}`">GroundOverlay</div></div></section>
      <section><h3>opacity: {{ opacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>行为</h3><label class="checkbox-row"><input type="checkbox" v-model="visible" />visible</label></section>
      <p class="muted small">把一张图片按经纬度矩形贴到地图上（type 支持 image / video / canvas）。</p>
    </div>
  </div>
</template>
