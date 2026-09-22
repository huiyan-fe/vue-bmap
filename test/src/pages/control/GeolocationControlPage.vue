<script setup lang="ts">
import { computed, ref } from 'vue';
import { GeolocationControl, BMAP_ANCHOR_BOTTOM_LEFT } from '@baidumap/vue-bmap';
import type { ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_BOTTOM_LEFT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const showAddressBar = ref(true);
const enableAutoLocation = ref(false);
const watchPosition = ref(false);
const useCompass = ref(false);
const autoZoom = ref(true);
const autoViewport = ref(true);
const logs = ref<string[]>([]);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
  showAddressBar: showAddressBar.value, enableAutoLocation: enableAutoLocation.value,
  watchPosition: watchPosition.value, useCompass: useCompass.value,
  autoZoom: autoZoom.value, autoViewport: autoViewport.value,
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
  <ControlPageLayout
    title="GeolocationControl / LocationControl" capability="GeolocationControl"
    version-note="LocationControl 是 GeolocationControl 的兼容别名。">
    <GeolocationControl
      :visible="visible" :anchor="anchor" :offset="offset"
      :show-address-bar="showAddressBar" :enable-auto-location="enableAutoLocation"
      :watch-position="watchPosition" :use-compass="useCompass"
      :auto-zoom="autoZoom" :auto-viewport="autoViewport"
      :on-location-success="(raw: unknown) => logEvent(`locationSuccess ${formatEventValue(raw)}`)"
      :on-location-error="(raw: unknown) => logEvent(`locationError ${formatEventValue(raw)}`)" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>定位选项</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="showAddressBar" />showAddressBar</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enableAutoLocation" />enableAutoLocation</label>
        <label class="checkbox-row"><input type="checkbox" v-model="watchPosition" />watchPosition</label>
        <label class="checkbox-row"><input type="checkbox" v-model="useCompass" />useCompass</label>
        <label class="checkbox-row"><input type="checkbox" v-model="autoZoom" />autoZoom</label>
        <label class="checkbox-row"><input type="checkbox" v-model="autoViewport" />autoViewport</label>
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
