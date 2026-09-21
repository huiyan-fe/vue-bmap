<script setup lang="ts">
import { switchVersion } from '../TestProvider';

defineProps<{ version: string }>();
const onChange = (e: Event) => switchVersion((e.target as HTMLSelectElement).value as any);
</script>

<template>
  <header class="app-header">
    <span class="brand">Vue-BMap 功能测试</span>
    <span class="spacer" />
    <span class="badge">version</span>
    <select :value="version" @change="onChange">
      <option value="4.0">4.0（WebGL）</option>
      <option value="3.0">3.0（2D）</option>
    </select>
  </header>
</template>
