<script setup lang="ts">
import { computed, ref } from 'vue';
import { CustomControl, BMAP_ANCHOR_TOP_LEFT } from '@baidumap/vue-bmap';
import type { ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_TOP_LEFT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const count = ref(0);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
}));
</script>

<template>
  <ControlPageLayout title="CustomControl">
    <CustomControl :visible="visible" :anchor="anchor" :offset="offset">
      <div style="background:#fff;border:1px solid #ccc;border-radius:4px;padding:6px 10px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:13px">
        <div>自定义控件</div>
        <button @click="count++">点击 +1（{{ count }}）</button>
      </div>
    </CustomControl>
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>说明</h3>
        <p class="muted small">
          children 会被 portal 到挂载在地图容器上的固定像素位置（不随地图平移/缩放移动），
          与绑定地理坐标的 CustomOverlay 是两套不同的定位机制。
        </p>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
