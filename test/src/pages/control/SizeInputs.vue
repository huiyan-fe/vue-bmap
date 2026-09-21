<script setup lang="ts">
import type { Size } from '@baidumap/vue-bmap';

const props = defineProps<{ modelValue?: Size }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Size | undefined): void }>();

const update = (field: keyof Size, raw: string) => {
  const cur: Partial<Size> = props.modelValue ?? {};
  const next: Partial<Size> = { ...cur, [field]: raw === '' ? undefined : Number(raw) };
  emit('update:modelValue', next.width == null && next.height == null ? undefined : (next as Size));
};
</script>

<template>
  <div class="input-row">
    <input type="number" placeholder="width" :value="modelValue?.width ?? ''"
      @input="update('width', ($event.target as HTMLInputElement).value)" />
    <input type="number" placeholder="height" :value="modelValue?.height ?? ''"
      @input="update('height', ($event.target as HTMLInputElement).value)" />
  </div>
</template>
