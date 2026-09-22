<script setup lang="ts">
/**
 * useDrivingRoute 测试页 —— 由 react-bmap 的 DrivingRoutePage.tsx 忠实复刻。
 * 驾车路线规划，完整覆盖 SDK dts。search 只接受坐标(Point)，不支持字符串地址。
 *
 * Vue 组织方式（对齐 GeocoderPage.vue）：hook 在 <Map> 内部子组件 DrivingRouteInner
 * 里调用（依赖地图上下文），data/loading/error（Ref）与 action 桥接给外层控制面板。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useDrivingRoute, useCapabilities } from '@baidumap/vue-bmap';
import type { DrivingRouteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

const STATUS_MEANING: Record<number, string> = {
  0: '成功', 1: '无路线', 2: '结果无效', 3: '未找到', 4: '未知位置', 5: '搜索失败',
};
function getPolicyValue(constantName: string, fallback: number): number {
  const SDK = (window as any).BMap;
  return SDK?.[constantName] ?? fallback;
}

const caps = useCapabilities();
const supported = computed(() => caps.value.has('DrivingRoute'));

// ─── 控件状态 ───
const start = ref('116.404,39.915');
const end = ref('116.397,39.908');
const waypoints = ref('');
const panelEl = ref<HTMLElement | null>(null);

// ─── hook 结果桥接 ───
const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
const status = ref<number | undefined>(undefined);
let hook: DrivingRouteHookResult | null = null;

// 响应式 options：policy / autoViewport / panel 变化触发 hook 重建
const options = reactive({
  location: '北京' as unknown,
  policy: getPolicyValue('BMAP_DRIVING_POLICY_LEAST_TIME', 0),
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
  onMarkersSet: (pois: any[]) => console.log('[DrivingRoute] onMarkersSet:', pois?.length, 'pois'),
  onPolylinesSet: (pls: any[]) => console.log('[DrivingRoute] onPolylinesSet:', pls?.length, 'polylines'),
});

watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const DrivingRouteInner = defineComponent({
  name: 'DrivingRouteInner',
  setup() {
    const r = useDrivingRoute(options as any);
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
      status.value = r.getStatus?.();
    });
    return () => null;
  },
});

const parsePoint = (s: string) => { const [lng, lat] = s.split(',').map(Number); return { lng, lat }; };
const handleSearch = () => {
  if (!hook) return;
  const wpList = waypoints.value ? waypoints.value.split(';').map(s => s.trim()).filter(Boolean).map(parsePoint) : [];
  hook.search(parsePoint(start.value), parsePoint(end.value), wpList.length > 0 ? { waypoints: wpList } : undefined);
};
const applyPolicy = (name: string, fallback: number) => {
  const v = getPolicyValue(name, fallback);
  options.policy = v;
  hook?.setPolicy(v);
};
const setAutoViewport = (on: boolean) => {
  options.renderOptions.autoViewport = on;
  if (on) hook?.enableAutoViewport(); else hook?.disableAutoViewport();
};
const clearResults = () => hook?.clearResults();
const cancel = () => hook?.cancel();
const hasData = computed(() => !!data.value && Object.keys(data.value as object).length > 0);

const CODE_EXAMPLE = `import { useDrivingRoute } from '@baidumap/vue-bmap';

const {
  search, clearResults, enableAutoViewport, disableAutoViewport,
  setPolicy, getStatus, data, loading, cancel,
} = useDrivingRoute({
  location: '北京',
  policy: 0,
  renderOptions: { map, panel: domEl, autoViewport: true },
  onSearchComplete: (results) => console.log(results),
  onMarkersSet: (pois) => console.log(pois),
});

// search 只接受 Point（{lng,lat}），不支持字符串地址
search({ lng: 116.404, lat: 39.915 }, { lng: 116.397, lat: 39.908 });

// 途经点
search(start, end, { waypoints: [{ lng, lat }] });

setPolicy(1); // 避高速
enableAutoViewport();
getStatus(); // 0=成功`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <DrivingRouteInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useDrivingRoute</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。驾车路线规划。注意：search 只接受坐标(Point)，不支持字符串地址。</p>
      </section>

      <section>
        <h3>起点 (lng,lat)</h3>
        <input class="full-width" v-model="start" @keydown.enter="handleSearch" />
        <p class="muted small">默认：天安门(116.404,39.915)</p>
      </section>

      <section>
        <h3>终点 (lng,lat)</h3>
        <input class="full-width" v-model="end" @keydown.enter="handleSearch" />
        <p class="muted small">默认：西单(116.397,39.908)</p>
      </section>

      <section>
        <h3>途经点（分号分隔，可选）</h3>
        <input class="full-width" placeholder="如：116.400,39.912;116.410,39.910" v-model="waypoints" />
      </section>

      <section>
        <h3>策略 (policy)</h3>
        <div class="btn-group">
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_DRIVING_POLICY_LEAST_TIME', 0) }" @click="applyPolicy('BMAP_DRIVING_POLICY_LEAST_TIME', 0)">默认</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_DRIVING_POLICY_AVOID_HIGHWAYS', 1) }" @click="applyPolicy('BMAP_DRIVING_POLICY_AVOID_HIGHWAYS', 1)">避高速</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_DRIVING_POLICY_SHORTEST', 2) }" @click="applyPolicy('BMAP_DRIVING_POLICY_SHORTEST', 2)">最短</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_DRIVING_POLICY_AVOID_TRAFFIC_JAM', 3) }" @click="applyPolicy('BMAP_DRIVING_POLICY_AVOID_TRAFFIC_JAM', 3)">避开拥堵</button>
        </div>
        <p class="muted small">策略值从 SDK 常量读取，当前 policy = {{ options.policy }}</p>
      </section>

      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="handleSearch" :disabled="!supported || loading">{{ loading ? 'searching...' : 'search' }}</button>
          <button @click="clearResults">clear</button>
          <button @click="cancel">cancel</button>
        </div>
        <div class="btn-group" style="flex-wrap:wrap;margin-top:4px">
          <button style="font-size:11px" :class="{ active: options.renderOptions.autoViewport }" @click="setAutoViewport(true)">enableAutoViewport</button>
          <button style="font-size:11px" :class="{ active: !options.renderOptions.autoViewport }" @click="setAutoViewport(false)">disableAutoViewport</button>
        </div>
      </section>

      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>status: <code>{{ String(status) }}</code> ({{ status !== undefined ? (STATUS_MEANING[status] ?? '未知') : 'N/A' }})</li>
          <li>data: <code>{{ hasData ? '有结果' : '空/无结果' }}</code></li>
        </ul>
        <p v-if="status !== undefined && status !== 0" class="muted small" style="color:#ff4d4f">
          ⚠️ 搜索失败（status={{ status }}）。可能是策略不支持该路线，或坐标无效。先试"默认"策略确认搜索能工作。
        </p>
      </section>

      <section>
        <h3>结果面板（SDK 渲染）</h3>
        <div ref="panelEl" style="min-height:60px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd">
          <span class="muted small">搜索后此处显示 SDK 路线结果</span>
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

