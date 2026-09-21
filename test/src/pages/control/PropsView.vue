<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ value: unknown }>();

function safeJsonStringify(value: unknown, space?: number): string {
  const seen = new WeakSet<object>();
  try {
    const text = JSON.stringify(value, (_k, cur) => {
      if (typeof cur === 'object' && cur !== null) {
        if (seen.has(cur as object)) return '[Circular]';
        seen.add(cur as object);
        if (typeof HTMLElement !== 'undefined' && cur instanceof HTMLElement) {
          return `[HTMLElement ${cur.tagName.toLowerCase()}]`;
        }
      }
      if (typeof cur === 'function') return '[Function]';
      return cur;
    }, space);
    return text === undefined ? String(value) : text;
  } catch {
    return String(value);
  }
}

const text = computed(() => safeJsonStringify(props.value, 2));
</script>

<template>
  <section>
    <h3>当前 Props</h3>
    <pre class="props-view">{{ text }}</pre>
  </section>
</template>

<style scoped>
.props-view {
  font-size: 11px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
}
</style>
