<script setup lang="ts">
import { computed, ref } from 'vue';
import { CityListControl, BMAP_ANCHOR_TOP_LEFT } from '@baidumap/vue-bmap';
import type { ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_TOP_LEFT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const expand = ref(false);
const canCheckSize = ref(true);
const logs = ref<string[]>([]);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
  expand: expand.value, canCheckSize: canCheckSize.value,
}));

function safeStringify(value: unknown): string {
  try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
}
const formatEventValue = (value: unknown, limit = 120) => {
  const text = safeStringify(value);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};
const logEvent = (message: string) => {
  logs.value = [`${new Date().toLocaleTimeString()} ${message}`, ...logs.value].slice(0, 20);
};
</script>

<template>
  <ControlPageLayout title="CityListControl" capability="CityListControl" version-note="v4+ 控件，v3 不支持。">
    <CityListControl
      :visible="visible" :anchor="anchor" :offset="offset"
      :expand="expand" :can-check-size="canCheckSize"
      :on-change-before="() => logEvent('changeBefore')"
      :on-change-after="() => logEvent('changeAfter')"
      :on-change-success="(poi: unknown) => logEvent(`changeSuccess ${formatEventValue(poi)}`)"
      :on-open="() => logEvent('open')"
      :on-close="() => logEvent('close')" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>构造选项</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="expand" />expand</label>
        <label class="checkbox-row"><input type="checkbox" v-model="canCheckSize" />canCheckSize</label>
      </section>
      <section>
        <h3>回调日志</h3>
        <p v-if="logs.length === 0" class="muted small">触发控件回调后显示日志</p>
        <pre v-else style="font-size:11px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ logs.join('\n') }}</pre>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
