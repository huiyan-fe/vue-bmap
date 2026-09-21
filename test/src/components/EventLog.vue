<script setup lang="ts">
defineProps<{ log: string[]; hint?: string }>();
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <div class="event-log-float">
    <div class="log-head">
      <span>事件日志（{{ log.length }}）</span>
      <button @click="emit('clear')">清空</button>
    </div>
    <div v-if="!log.length" style="color:#666">{{ hint || '与覆盖物交互触发事件' }}</div>
    <div v-for="(line, i) in log" :key="i" style="line-height:1.6">{{ line }}</div>
  </div>
</template>
