<script setup lang="ts">
import { ref } from 'vue';
import { Map, Prism, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const path = [{ lng: 116.4, lat: 39.912 }, { lng: 116.41, lat: 39.912 }, { lng: 116.41, lat: 39.92 }, { lng: 116.4, lat: 39.92 }];
const altitude = ref(1000);
const topFillColor = ref('#1890ff');
const sideFillColor = ref('#69c0ff');
const topFillOpacity = ref(0.9);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" :tilt="55" :heading="20" style="height:100%">
        <Prism
          :path="path" :altitude="altitude" :top-fill-color="topFillColor" :side-fill-color="sideFillColor"
          :top-fill-opacity="topFillOpacity"
          :onClick="() => log('🔷 prism.click')" :onMouseOver="() => log('🔷 prism.mouseover')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与棱柱交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Prism（全量） <span :class="`cap-tag ${caps.has('Prism') ? 'ok' : 'no'}`">{{ caps.has('Prism') ? 'v4+' : 'v3 ✗' }}</span></h2>
      <section><h3>altitude: {{ altitude }} 米</h3><input class="full-width" type="range" min="100" max="5000" step="100" :value="altitude" @input="altitude = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>topFillColor</h3><input type="color" :value="topFillColor" @input="topFillColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>sideFillColor</h3><input type="color" :value="sideFillColor" @input="sideFillColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>topFillOpacity: {{ topFillOpacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="topFillOpacity" @input="topFillOpacity = +($event.target as HTMLInputElement).value" /></section>
      <p class="muted small">3D 棱柱，整类 @since 4.0；需要俯仰角才能看到立体效果。</p>
    </div>
  </div>
</template>
