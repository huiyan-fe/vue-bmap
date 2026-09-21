<script setup lang="ts">
import type { ControlAnchor } from '@baidumap/vue-bmap';

defineProps<{ modelValue?: ControlAnchor }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: ControlAnchor | undefined): void }>();

const OPTIONS: Array<{ label: string; value: ControlAnchor }> = [
  { label: 'TOP_LEFT', value: 0 },
  { label: 'TOP_RIGHT', value: 1 },
  { label: 'BOTTOM_LEFT', value: 2 },
  { label: 'BOTTOM_RIGHT', value: 3 },
];

const onChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  emit('update:modelValue', v === '' ? undefined : (Number(v) as ControlAnchor));
};
</script>

<template>
  <select :value="modelValue ?? ''" @change="onChange">
    <option value="">默认</option>
    <option v-for="o in OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>
