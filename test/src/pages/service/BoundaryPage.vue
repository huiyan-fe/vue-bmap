<script setup lang="ts">
/**
 * useBoundary 测试页 —— 由 react-bmap 的 BoundaryPage.tsx 忠实复刻。
 * 覆盖：get(name)、cancel。
 *
 * Vue 组织方式（对齐 LocalSearchPage / GeocoderPage）：service hook 在 <Map> 内部子组件里
 * 调用，返回的 data/loading/error 是 Ref，用 watchEffect 桥接到外层控制面板；action 通过
 * 保存的 hook 引用调用。
 */
import { computed, defineComponent, ref, shallowRef, watchEffect } from 'vue';
import { Map, useBoundary, useCapabilities } from '@baidumap/vue-bmap';
import type { BoundaryHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Boundary'));

const PRESETS = ['北京市', '上海市', '广东省', '深圳市', '成都市'];
const query = ref('北京市');

// hook 结果桥接到外层（hook 在 <Map> 内子组件里调用，返回的都是 Ref）
const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: BoundaryHookResult | null = null;

const BoundaryInner = defineComponent({
  name: 'BoundaryInner',
  setup() {
    const r = useBoundary();
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const get = (name: string) => { hook?.get(name); };
const runPreset = (p: string) => { query.value = p; hook?.get(p); };
const cancel = () => { hook?.cancel(); };

const stringifyData = (d: unknown): string => {
  try { return JSON.stringify(d, (_k, v) => (v instanceof HTMLElement ? '<DOM>' : typeof v === 'function' ? '<fn>' : v), 2); }
  catch { return String(d); }
};

const CODE_EXAMPLE = `import { useBoundary } from '@baidumap/vue-bmap';

const { get, data, loading, error, cancel } = useBoundary();
get('北京市');`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="8" style="height:100%">
        <BoundaryInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useBoundary</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。行政区划边界查询。</p>
      </section>
      <section>
        <h3>查询（行政区名）</h3>
        <input class="full-width" v-model="query" @keydown.enter="get(query)" />
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="p in PRESETS" :key="p" style="font-size:11px" @click="runPreset(p)">{{ p }}</button>
        </div>
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group">
          <button @click="get(query)" :disabled="!supported || loading">{{ loading ? 'searching...' : 'get' }}</button>
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
      <section v-if="data != null">
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
