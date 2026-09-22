<script setup lang="ts">
/**
 * useLocalSearch 测试页 —— 由 react-bmap 的 LocalSearchPage.tsx 忠实复刻。
 *
 * 覆盖：search（普通/多关键词/forceLocal）、searchNearby、searchInBounds、
 * gotoPage（翻页控制 panel）、clearResults、cancel、pageCapacity / renderOptions
 * （panel / autoViewport）配置、onSearchComplete / onMarkersSet 回调。
 *
 * Vue 组织方式（对齐 GeocoderPage.vue）：service hook 必须在 <Map> 内部的子组件
 * 里调用（依赖地图上下文），用一个内部子组件 LocalSearchInner 在 Map 内调用 hook，
 * 再把 data/loading/error（Ref）与 action 桥接给外层控制面板。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useLocalSearch, useCapabilities } from '@baidumap/vue-bmap';
import type { LocalSearchHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('LocalSearch'));

// ─── 控件状态 ───
const keyword = ref('餐厅');
const mode = ref<'search' | 'nearby' | 'bounds'>('search');
const nearbyCenter = ref('116.404,39.915');
const nearbyRadius = ref(1000);
const panelEl = ref<HTMLElement | null>(null);

// 事件日志（最新在前，最多 20 条）
const eventLog = ref<string[]>([]);
const log = (msg: string) => {
  eventLog.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...eventLog.value].slice(0, 20);
};

// ─── hook 结果桥接到外层（hook 在 <Map> 内的子组件里调用，返回的都是 Ref）───
const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: LocalSearchHookResult | null = null;

// 响应式 options：pageCapacity / autoViewport / panel 变化触发 hook 重建（对齐 react state → 依赖）
const options = reactive({
  location: '北京' as unknown,
  pageCapacity: 10,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
  onSearchComplete: (results: any) => {
    const num = Array.isArray(results) ? results.length : results?.getNumPois?.() ?? '?';
    log(`✅ onSearchComplete: ${num} 条结果`);
  },
  onMarkersSet: (pois: any[]) => { log(`📍 onMarkersSet: ${pois.length} 个标注`); },
});

// panel DOM 就绪后设入 options → 触发 hook 重建（对齐 react 的 panel callback ref → state）
watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const LocalSearchInner = defineComponent({
  name: 'LocalSearchInner',
  setup() {
    const r = useLocalSearch(options as any);
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
    });
    return () => null;
  },
});

const handleRun = () => {
  if (!hook) return;
  if (mode.value === 'search') {
    hook.search(keyword.value);
    log(`🔍 search("${keyword.value}")`);
  } else if (mode.value === 'nearby') {
    const [lng, lat] = nearbyCenter.value.split(',').map(Number);
    hook.searchNearby(keyword.value, { lng, lat }, nearbyRadius.value);
    log(`📍 searchNearby("${keyword.value}", ${nearbyCenter.value}, ${nearbyRadius.value}m)`);
  } else {
    hook.searchInBounds(keyword.value, { sw: { lng: 116.38, lat: 39.90 }, ne: { lng: 116.42, lat: 39.93 } } as any);
    log(`📐 searchInBounds("${keyword.value}", bounds)`);
  }
};
const gotoPage = (p: number) => { hook?.gotoPage(p); log(`📄 gotoPage(${p})`); };
const clearResults = () => { hook?.clearResults(); log('🧹 clearResults'); };
const cancel = () => { hook?.cancel(); };

const CODE_EXAMPLE = `import { useLocalSearch } from '@baidumap/vue-bmap';

const {
  data, loading, error, supported,
  search, searchNearby, searchInBounds, gotoPage, clearResults, cancel,
} = useLocalSearch({
  location: '北京',
  pageCapacity: 10,
  renderOptions: { panel: domEl, autoViewport: true },
  onSearchComplete: (results) => console.log(results),
  onMarkersSet: (pois) => console.log(pois),
});

search('餐厅');                          // 普通搜索
search(['餐厅', '酒店']);                // 多关键词
searchNearby('餐厅', { lng, lat }, 1000); // 周边搜索
searchInBounds('餐厅', bounds);          // 范围搜索
gotoPage(2);                              // 翻页（控制 panel）
clearResults();                           // 清空
cancel();                                // 取消`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <LocalSearchInner />
      </Map>
      <EventLog :log="eventLog" hint="操作日志在此" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>useLocalSearch</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。本地搜索服务，完整实现 SDK dts 全部方法。</p>
      </section>

      <section>
        <h3>搜索模式</h3>
        <div class="btn-group">
          <button :class="{ active: mode === 'search' }" @click="mode = 'search'">普通搜索</button>
          <button :class="{ active: mode === 'nearby' }" @click="mode = 'nearby'">周边搜索</button>
          <button :class="{ active: mode === 'bounds' }" @click="mode = 'bounds'">范围搜索</button>
        </div>
      </section>

      <section>
        <h3>关键词</h3>
        <input class="full-width" v-model="keyword" @keydown.enter="handleRun" />
      </section>

      <section v-if="mode === 'nearby'">
        <h3>周边参数</h3>
        <label class="checkbox-row">中心点 (lng,lat) <input type="text" v-model="nearbyCenter" /></label>
        <label class="checkbox-row">半径 (m) <input type="number" v-model.number="nearbyRadius" /></label>
      </section>

      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="handleRun" :disabled="!supported || loading">{{ loading ? 'searching...' : 'run' }}</button>
          <button @click="gotoPage(0)" :disabled="!supported || loading">第1页</button>
          <button @click="gotoPage(1)" :disabled="!supported || loading">第2页</button>
          <button @click="clearResults">clear</button>
          <button @click="cancel">cancel</button>
        </div>
        <p class="muted small">翻页按钮控制下方结果面板的页码</p>
      </section>

      <section>
        <h3>配置</h3>
        <label class="checkbox-row">pageCapacity <input type="number" min="1" max="100" v-model.number="options.pageCapacity" /></label>
        <label class="checkbox-row"><input type="checkbox" v-model="options.renderOptions.autoViewport" /> autoViewport（重建）</label>
      </section>

      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>data: <code>{{ data ? '有结果' : 'null' }}</code></li>
        </ul>
      </section>

      <section>
        <h3>结果面板（SDK 渲染，翻页控制）</h3>
        <div ref="panelEl" style="min-height:60px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd">
          <span class="muted small">搜索后此处显示 SDK 结果列表</span>
        </div>
      </section>

      <section v-if="data">
        <h3>结果（JSON）</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:200px">{{ safeStringifySdkResult(data) }}</pre>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

