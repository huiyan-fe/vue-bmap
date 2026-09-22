<script setup lang="ts">
/**
 * useConvertor 测试页 —— 由 react-bmap 的 ConvertorPage.tsx 忠实复刻。
 * 覆盖：translate(points, from, to)、cancel；演示 >100 点自动分批。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用，返回的 data/loading/error 是 Ref，用
 * watchEffect 桥接到外层控制面板。
 */
import { computed, defineComponent, ref, shallowRef, watchEffect } from 'vue';
import { Map, useConvertor, useCapabilities } from '@baidumap/vue-bmap';
import type { ConvertorHookResult } from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

// from（源坐标系）可为多种类型
const COORD_TYPES = [
  { label: 'GPS (WGS84)', value: 1 },
  { label: 'Google/Soso (GCJ02)', value: 3 },
  { label: 'Baidu (BD09)', value: 5 },
  { label: 'Baidu MC (BD09MC)', value: 6 },
];
// to（目标坐标系）：百度 coords 服务只支持转成百度坐标（5 bd09ll / 6 bd09mc），
// 选 1/3 等会返回 status 22 "to illegal, not support such coord type"
const TO_COORD_TYPES = [
  { label: 'Baidu (BD09)', value: 5 },
  { label: 'Baidu MC (BD09MC)', value: 6 },
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Convertor'));

const lng = ref('116.404');
const lat = ref('39.915');
const from = ref(1);
const to = ref(5);
const batchN = ref(250);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: ConvertorHookResult | null = null;

const ConvertorInner = defineComponent({
  name: 'ConvertorInner',
  setup() {
    const r = useConvertor();
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const handleRun = () => {
  hook?.translate([{ lng: Number(lng.value), lat: Number(lat.value) } as Point], from.value, to.value);
};

// 生成 N 个点，演示 >100 自动分批（原生 translate 单请求上限 100，本 hook 内部按 100 分批并发再合并）
const runBatch = () => {
  const pts: Point[] = Array.from({ length: batchN.value }, (_v, i) => ({
    lng: 116.3 + (i % 50) * 0.002,
    lat: 39.8 + Math.floor(i / 50) * 0.002,
  }));
  hook?.translate(pts, from.value, to.value);
};

const cancel = () => { hook?.cancel(); };

const outCount = computed(() => (data.value as { points?: unknown[] } | undefined)?.points?.length ?? 0);

const stringifyData = (d: unknown): string => {
  try { return JSON.stringify(d, (_k, v) => (v instanceof HTMLElement ? '<DOM>' : typeof v === 'function' ? '<fn>' : v), 2); }
  catch { return String(d); }
};

const CODE_EXAMPLE = `import { useConvertor } from '@baidumap/vue-bmap';

const { translate, data, loading, cancel } = useConvertor();
// from=1 (WGS84), to=5 (BD09)
translate([{ lng: 116.404, lat: 39.915 }], 1, 5);

// >100 点也可直接传：hook 内部按 100 自动分批、并发再合并
translate(manyPoints /* 例如 250 个点 */, 1, 5);`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <ConvertorInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useConvertor</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。坐标转换服务。</p>
      </section>
      <section>
        <h3>坐标</h3>
        <div class="input-row">
          <label>lng</label><input type="number" step="0.001" v-model="lng" />
          <label>lat</label><input type="number" step="0.001" v-model="lat" />
        </div>
      </section>
      <section>
        <h3>转换</h3>
        <label class="checkbox-row">from (源坐标系)
          <select v-model.number="from">
            <option v-for="c in COORD_TYPES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </label>
        <label class="checkbox-row">to (目标坐标系)
          <select v-model.number="to">
            <option v-for="c in TO_COORD_TYPES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </label>
        <p class="muted small">百度 coords 服务只支持转成百度坐标（to=5 或 6）；to 选其他类型会返回 status 22 "to illegal"。</p>
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group">
          <button @click="handleRun" :disabled="!supported || loading">{{ loading ? 'converting...' : 'translate（单点）' }}</button>
          <button @click="cancel">cancel</button>
        </div>
      </section>
      <section>
        <h3>批量（&gt;100 点自动分批）</h3>
        <div class="input-row">
          <label>点数</label>
          <input type="number" min="1" max="2000" v-model.number="batchN" style="width:80px" />
          <button @click="runBatch" :disabled="!supported || loading">{{ loading ? 'converting...' : `转换 ${batchN} 个点` }}</button>
        </div>
        <p class="muted small">
          原生 translate 单请求上限约 100 点、&gt;100 会静默失败；本 hook 内部按 100 分批、并发请求再按序合并。
          当前结果点数：<code>{{ outCount }}</code>
        </p>
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
