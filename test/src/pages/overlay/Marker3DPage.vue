<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, Marker3D, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Marker3D') || caps.value.has('Map.setHeading'));
const height = ref(300);
const shape = ref(1);
const size = ref(80);
const color = ref('#1890ff');
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="15" :tilt="55" style="height:100%">
        <Marker3D v-if="supported" :position="BEIJING" :height="height" :shape="shape" :size="size" :fill-color="color" :fill-opacity="0.85" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>Marker3D <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span></h2>
      <section><h3>height: {{ height }}</h3><input class="full-width" type="range" min="50" max="1000" step="10" :value="height" @input="height = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>shape</h3><div class="btn-group"><button :class="{ active: shape === 1 }" @click="shape = 1">圆形(1)</button><button :class="{ active: shape === 2 }" @click="shape = 2">方形(2)</button></div></section>
      <section><h3>size: {{ size }}</h3><input class="full-width" type="range" min="20" max="200" :value="size" @input="size = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>fillColor</h3><input type="color" :value="color" @input="color = ($event.target as HTMLInputElement).value" /></section>
      <p class="muted small">@since 4.0 WebGL；需俯仰角查看立体效果。shape/size 无 setter，改动会重建实例。</p>
    </div>
  </div>
</template>
