<script setup lang="ts">
import { computed } from 'vue';
import { useCapabilities } from '@baidumap/vue-bmap';
import { COMPONENTS } from '../config/components';
import { API_DATA } from '../config/apiData';
import { getDemosById } from '../demos';
import CodeBlock from '../components/CodeBlock.vue';
import ApiTable from '../components/ApiTable.vue';

const props = defineProps<{ id: string }>();

const meta = computed(() => COMPONENTS.find((c) => c.id === props.id));
const demos = computed(() => getDemosById(props.id));
const apiData = computed(() => API_DATA[props.id] ?? []);

// 能力矩阵：判断该组件在当前地图版本（3.0/4.0）下是否可用
const caps = useCapabilities();
const supported = computed(() => {
  const m = meta.value;
  if (!m) return true;
  if (m.capability === false) return true; // 非 SDK 能力（Provider/Hook 等）不受版本约束
  const capName = m.name.startsWith('use') ? m.name.slice(3) : m.name;
  return caps.value.has(capName);
});
</script>

<template>
  <div v-if="meta">
    <h1 style="margin-bottom: 8px">{{ meta.name }}</h1>
    <p style="color: #666; margin-bottom: 24px">{{ meta.description }}</p>

    <div v-if="!supported" class="unsupported-note">
      ⚠️ 此组件在当前地图版本下不可用，请切换到支持的版本。
    </div>
    <template v-else-if="demos.length">
      <div v-for="(demo, i) in demos" :key="i" style="margin-bottom: 32px">
        <h2 v-if="demo.title" style="font-size: 16px; margin: 24px 0 12px">{{ demo.title }}</h2>
        <div class="demo-stage">
          <component :is="demo.component" />
        </div>
        <h3 style="font-size: 14px; margin: 20px 0 10px; color: #666">代码</h3>
        <CodeBlock :code="demo.code" language="markup" />
      </div>
    </template>
    <div v-else class="loading">示例编写中…</div>

    <template v-if="apiData.length">
      <h2 style="font-size: 16px; margin: 24px 0 12px">API</h2>
      <ApiTable :data="apiData" />
    </template>
  </div>
  <div v-else class="loading">未找到组件：{{ id }}</div>
</template>

<style scoped>
.unsupported-note {
  padding: 16px; background: #fff7e6; border: 1px solid #ffd591; border-radius: 6px;
  color: #fa8c16; font-size: 14px;
}
</style>
