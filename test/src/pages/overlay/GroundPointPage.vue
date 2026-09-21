<script setup lang="ts">
import { ref } from 'vue';
import { Map, GroundPoint, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const scale = ref(1);
const rotation = ref(0);
const opacity = ref(1);
const url = 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png';
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" :tilt="60" :heading="30" style="height:100%">
        <GroundPoint
          :point="BEIJING" :url="url" :size="{ width: 96, height: 96 }" :level="14"
          :scale="scale" :rotation="rotation" :opacity="opacity"
          :onClick="() => log('📍 groundPoint.click')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与地面点交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>GroundPoint（全量） <span :class="`cap-tag ${caps.has('GroundPoint') ? 'ok' : 'no'}`">{{ caps.has('GroundPoint') ? 'v4+' : 'v3 ✗' }}</span></h2>
      <section><h3>scale: {{ scale.toFixed(2) }}</h3><input class="full-width" type="range" min="0.2" max="3" step="0.1" :value="scale" @input="scale = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>rotation: {{ rotation }}°</h3><input class="full-width" type="range" min="0" max="360" :value="rotation" @input="rotation = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>opacity: {{ opacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" /></section>
      <p class="muted small">贴地图片点（随地图俯仰"躺"在地面上），整类 @since 4.0。</p>
    </div>
  </div>
</template>
