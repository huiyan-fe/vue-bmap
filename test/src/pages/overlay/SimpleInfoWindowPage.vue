<script setup lang="ts">
/** SimpleInfoWindow 测试页 */
import { ref } from 'vue';
import { Map, SimpleInfoWindow, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const title = ref('天安门');
const content = ref('这是一个简易信息窗口');
const open = ref(true);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <SimpleInfoWindow v-if="caps.has('Map.setHeading')" :position="BEIJING" :open="open" :title="title" :content="content" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>SimpleInfoWindow</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${caps.has('Map.setHeading') ? 'ok' : 'no'}`">{{ caps.has('Map.setHeading') ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。简易信息窗口。</p>
      </section>
      <section><h3>title</h3><input class="full-width" :value="title" @input="title = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>content</h3><input class="full-width" :value="content" @input="content = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>open</h3><label class="checkbox-row"><input type="checkbox" v-model="open" />显示信息窗口</label></section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ `<SimpleInfoWindow :position="pt" :open="true" title="标题" content="内容" />` }}</pre>
      </section>
    </div>
  </div>
</template>
