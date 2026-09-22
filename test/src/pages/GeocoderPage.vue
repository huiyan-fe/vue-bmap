<script setup lang="ts">
/**
 * useGeocoder 测试页 —— 由 react-bmap 的 GeocoderPage.tsx 忠实复刻。
 *
 * 覆盖：getPoint（地址→坐标）/ getLocation（坐标→地址）/ 批量 getPoints·getLocations（并发）。
 *
 * Vue 组织方式（对齐 LocalSearchPage.vue）：service hook 在 <Map> 内部的子组件
 * GeocoderInner 里调用，返回的都是 Ref，桥接（watchEffect）给外层控制面板；
 * 批量结果的 Marker 也在 GeocoderInner 内（Map 上下文中）渲染。
 */
import { computed, defineComponent, h, ref, shallowRef, watchEffect } from 'vue';
import { Map, Marker, useGeocoder, useCapabilities } from '@baidumap/vue-bmap';
import type { GeocoderHookResult, Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';
import { safeStringifySdkResult } from '../utils/sdkResult';

const PRESET_ADDRESSES = [
  '北京市海淀区中关村',
  '北京市朝阳区国贸',
  '北京市东城区天安门',
  '北京市西城区西单',
  '北京市丰台区北京南站',
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Geocoder'));

const mode = ref<'getPoint' | 'getLocation' | 'batch'>('getPoint');
const address = ref('北京市天安门');
const lng = ref('116.404');
const lat = ref('39.915');

// ─── hook 结果桥接到外层（hook 在 <Map> 内的子组件里调用，返回的都是 Ref）───
const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: GeocoderHookResult | null = null;

// ─── 批量状态 ───
const batchText = ref(PRESET_ADDRESSES.join('\n'));
const batchRows = ref<{ address: string; point: Point | null }[]>([]);
const batchAddrs = ref<(string | null)[]>([]);
const batchBusy = ref(false);
const elapsed = ref<number | null>(null);
const batchAddresses = computed(() =>
  batchText.value.split('\n').map((s) => s.trim()).filter(Boolean),
);
const okPoints = computed(
  () => batchRows.value.filter((r) => r.point) as { address: string; point: Point }[],
);

const GeocoderInner = defineComponent({
  name: 'GeocoderInner',
  setup() {
    const r = useGeocoder();
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
    });
    return () =>
      mode.value === 'batch'
        ? okPoints.value.map((row, i) =>
            h(Marker, { key: row.address, position: row.point, title: `${i + 1}. ${row.address}` }),
          )
        : null;
  },
});

const handleRun = () => {
  if (!hook) return;
  if (mode.value === 'getPoint') {
    hook.getPoint(address.value);
  } else if (mode.value === 'getLocation') {
    hook.getLocation({ lng: Number(lng.value), lat: Number(lat.value) });
  }
};

const runGetPoints = async () => {
  if (!hook) return;
  batchBusy.value = true;
  elapsed.value = null;
  batchAddrs.value = [];
  const t0 = performance.now();
  const points = await hook.getPoints(batchAddresses.value);
  elapsed.value = Math.round(performance.now() - t0);
  batchRows.value = batchAddresses.value.map((a, i) => ({ address: a, point: points[i] }));
  batchBusy.value = false;
};

const runGetLocations = async () => {
  if (!hook) return;
  const pts = okPoints.value.map((r) => r.point);
  if (!pts.length) return;
  batchBusy.value = true;
  const results = await hook.getLocations(pts);
  batchAddrs.value = results.map((r) => (r as { address?: string } | null)?.address ?? null);
  batchBusy.value = false;
};

const cancel = () => hook?.cancel();

/** 批量结果的反查地址（getLocations 结果，保序）——按地址对齐到 okPoints 顺序。 */
const reverseAddr = (addr: string): string | null => {
  const idx = okPoints.value.findIndex((o) => o.address === addr);
  return idx >= 0 ? batchAddrs.value[idx] ?? null : null;
};

const CODE_EXAMPLE = `import { useGeocoder } from '@baidumap/vue-bmap';

const { getPoint, getLocation, getPoints, getLocations, data, loading, cancel } = useGeocoder();
getPoint('北京市天安门');              // 单发 地址→坐标（结果落 data）
getLocation({ lng: 116.404, lat: 39.915 }); // 单发 坐标→地址

// 并发批量（直接返回 Promise，不经过 data/loading，保序、失败位 null）
const points = await getPoints(['北京', '上海', '广州']);
const addrs = await getLocations(points.filter(Boolean));`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="mode === 'batch' ? 11 : 12" style="height:100%">
        <GeocoderInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useGeocoder</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。地理编码：地址↔坐标转换。</p>
      </section>

      <section>
        <h3>模式</h3>
        <div class="btn-group">
          <button :class="{ active: mode === 'getPoint' }" @click="mode = 'getPoint'">地址→坐标</button>
          <button :class="{ active: mode === 'getLocation' }" @click="mode = 'getLocation'">坐标→地址</button>
          <button :class="{ active: mode === 'batch' }" @click="mode = 'batch'">批量(并发)</button>
        </div>
      </section>

      <template v-if="mode !== 'batch'">
        <section v-if="mode === 'getPoint'">
          <h3>地址</h3>
          <input class="full-width" v-model="address" @keydown.enter="handleRun" />
        </section>
        <section v-else>
          <h3>坐标</h3>
          <div class="input-row">
            <label>lng</label><input type="number" step="0.001" v-model="lng" />
            <label>lat</label><input type="number" step="0.001" v-model="lat" />
          </div>
        </section>

        <section>
          <h3>操作</h3>
          <div class="btn-group">
            <button @click="handleRun" :disabled="!supported || loading">{{ loading ? 'searching...' : 'run' }}</button>
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
          <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:300px">{{ safeStringifySdkResult(data) }}</pre>
        </section>
      </template>

      <template v-if="mode === 'batch'">
        <section>
          <h3>地址列表（每行一个）</h3>
          <textarea class="full-width" :rows="6" v-model="batchText" style="font-size:12px;font-family:monospace" />
          <div class="btn-group" style="margin-top:8px">
            <button @click="runGetPoints" :disabled="!supported || batchBusy || !batchAddresses.length">getPoints（并发→坐标）</button>
            <button @click="runGetLocations" :disabled="!supported || batchBusy || !okPoints.length">getLocations（并发→地址）</button>
          </div>
          <p v-if="elapsed != null" class="muted small">{{ batchAddresses.length }} 个地址并发耗时 ≈ {{ elapsed }}ms（成功 {{ okPoints.length }}）</p>
        </section>

        <section>
          <h3>结果（保序，失败位 null）</h3>
          <p v-if="batchRows.length === 0" class="muted small">点上面按钮运行</p>
          <ol style="font-size:12px;padding-left:20px">
            <li v-for="r in batchRows" :key="r.address" style="margin-bottom:4px">
              {{ r.address }}
              <span v-if="r.point" style="color:#2b8a3e"> → {{ r.point.lng.toFixed(5) }}, {{ r.point.lat.toFixed(5) }}</span>
              <span v-else style="color:#c92a2a"> → null</span>
              <span v-if="r.point && reverseAddr(r.address)" style="color:#1971c2"> ↩ {{ reverseAddr(r.address) }}</span>
            </li>
          </ol>
        </section>

        <section>
          <p class="muted small">
            批量方法直接返回 Promise（不经过 data/loading），内部并发 + Promise.all 保序、每项各带 10s 超时兜底。
            底层 Geocoder 实例并发安全，一个实例即可。
          </p>
        </section>
      </template>

      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>
