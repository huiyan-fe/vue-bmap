<script setup lang="ts">
/**
 * useLocalCity 测试页 —— 由 react-bmap 的 LocalCityPage.tsx 忠实复刻。
 * 覆盖：get()、cancel。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用，返回的 data/loading/error 是 Ref，用
 * watchEffect 桥接到外层控制面板。
 */
import { computed, defineComponent, ref, shallowRef, watchEffect } from 'vue';
import { Map, useLocalCity, useCapabilities } from '@baidumap/vue-bmap';
import type { LocalCityHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('LocalCity'));

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: LocalCityHookResult | null = null;

const LocalCityInner = defineComponent({
  name: 'LocalCityInner',
  setup() {
    const r = useLocalCity();
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const get = () => { hook?.get(); };
const cancel = () => { hook?.cancel(); };

const stringifyData = (d: unknown): string => {
  try { return JSON.stringify(d, (_k, v) => (v instanceof HTMLElement ? '<DOM>' : typeof v === 'function' ? '<fn>' : v), 2); }
  catch { return String(d); }
};

const CODE_EXAMPLE = `import { useLocalCity } from '@baidumap/vue-bmap';

const { get, data, loading, error, cancel } = useLocalCity();
get(); // 获取当前城市`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <LocalCityInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useLocalCity</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。城市定位服务。v3 不支持。</p>
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group">
          <button @click="get" :disabled="!supported || loading">{{ loading ? 'locating...' : '获取城市' }}</button>
          <button @click="cancel">cancel</button>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>data: <code>{{ data ? '有结果' : 'null' }}</code></li>
        </ul>
      </section>
      <section v-if="data">
        <h3>结果</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:300px">{{ stringifyData(data) }}</pre>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>
