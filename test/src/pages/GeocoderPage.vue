<script setup lang="ts">
import { defineComponent, h, ref, computed } from 'vue';
import { Map, Marker, useGeocoder } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';
import { safeStringifySdkResult } from '../utils/sdkResult';

// 内嵌：useGeocoder + 结果面板（用 safeStringifySdkResult 检视原始 SDK 结果对象）
const GeocoderInner = defineComponent({
  name: 'GeocoderInner',
  setup() {
    const addr = ref('北京市海淀区上地十街10号');
    const { data, loading, error, getPoint } = useGeocoder();
    const point = computed(() => (data.value as any)?.point ?? null);
    return () => [
      h('div', { class: 'test-panel' }, [
        h('h3', 'useGeocoder 测试'),
        h('div', { style: 'display:flex;gap:6px' }, [
          h('input', { value: addr.value, style: 'flex:1', onInput: (e: any) => { addr.value = e.target.value; }, onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') getPoint(addr.value); } }),
          h('button', { onClick: () => getPoint(addr.value) }, loading.value ? '...' : '地址转坐标'),
        ]),
        error.value
          ? h('div', { class: 'test-result', style: 'color:#f87171' }, `❌ ${error.value.message}`)
          : data.value
            ? h('div', { class: 'test-result' }, safeStringifySdkResult(data.value))
            : null,
      ]),
      point.value ? h(Marker, { position: point.value }) : null,
    ];
  },
});
</script>

<template>
  <Map class="test-map" :center="BEIJING" :zoom="12">
    <GeocoderInner />
  </Map>
</template>
