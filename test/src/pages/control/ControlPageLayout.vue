<script setup lang="ts">
import { computed } from 'vue';
import { Map, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const props = withDefaults(defineProps<{
  title: string;
  capability?: string;
  versionNote?: string;
  zoom?: number;
}>(), { zoom: 12 });

const caps = useCapabilities();
const supported = computed(() => !props.capability || caps.value.has(props.capability as any));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="zoom" style="height:100%">
        <slot v-if="supported" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>{{ title }}</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p v-if="versionNote" class="muted small">{{ versionNote }}</p>
      </section>
      <slot name="controls" />
    </div>
  </div>
</template>
