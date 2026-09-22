<script setup lang="ts">
/** LineLayer 测试页 — v4+。线图层（继承 NormalLayer）。 */
import { computed, reactive, ref } from 'vue';
import { Map, LineLayer, useCapabilities, useDriver } from '@baidumap/vue-bmap';
import type { LineLayerProps } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

interface LayerBaseOptions { visible?: boolean; opacity?: number; minZoom?: number; maxZoom?: number; zIndex?: number; }

const STYLE_PRESETS: Array<{ label: string; value: string }> = [
  { label: '蓝色细线', value: '{\n  "strokeColor": "#1890ff",\n  "strokeWeight": 3\n}' },
  { label: '红色粗线', value: '{\n  "strokeColor": "#f5222d",\n  "strokeWeight": 8,\n  "strokeOpacity": 0.8\n}' },
  { label: '虚线', value: '{\n  "strokeColor": "#52c41a",\n  "strokeWeight": 4,\n  "strokeStyle": "dashed"\n}' },
];

const caps = useCapabilities();
const driver = useDriver();

// 示例线数据（LineString GeoJSON），绕北京中心的一条折线，供 LineLayer 渲染
const LINE_DATA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '示例线' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [116.35, 39.90], [116.39, 39.94], [116.43, 39.905], [116.46, 39.95],
        ],
      },
    },
  ],
};
const supported = computed(() => caps.value.has('LineLayer'));
const presence = computed<'present' | 'missing' | 'unknown'>(() => {
  const d = driver.value;
  if (!d) return 'unknown';
  const raw = d.rawSDK as Record<string, unknown> | null | undefined;
  if (!raw) return 'unknown';
  return typeof raw['LineLayer'] === 'function' ? 'present' : 'missing';
});
const PRESENCE_TEXT: Record<'present' | 'missing' | 'unknown', string> = {
  present: 'SDK 类存在', missing: 'SDK 类缺失', unknown: 'SDK 未就绪',
};

const mounted = ref(true);
const base = reactive<LayerBaseOptions>({ visible: true });
const styleText = ref(STYLE_PRESETS[0].value);
const idKey = ref('');
const crs = ref('');
const enablePicked = ref(false);

const parsedStyle = computed<{ value: unknown; error: string }>(() => {
  if (styleText.value.trim() === '') return { value: undefined, error: '' };
  try { return { value: JSON.parse(styleText.value) as unknown, error: '' }; }
  catch (e) { return { value: undefined, error: (e as Error).message }; }
});

const options = computed<LineLayerProps>(() => ({
  ...base,
  style: parsedStyle.value.value as LineLayerProps['style'],
  idKey: idKey.value || undefined,
  crs: crs.value || undefined,
  enablePicked: enablePicked.value || undefined,
}));

const resetBase = () => { base.visible = true; base.opacity = undefined; base.minZoom = undefined; base.maxZoom = undefined; base.zIndex = undefined; };
const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const CODE = `<Map :default-center="center" :default-zoom="11">
  <LineLayer :style="{ strokeColor: '#1890ff', strokeWeight: 3 }" enable-picked />
</Map>`;

function safeJsonStringify(value: unknown, space?: number): string {
  const seen = new WeakSet<object>();
  try {
    const text = JSON.stringify(value, (_k, cur) => {
      if (typeof cur === 'object' && cur !== null) {
        if (seen.has(cur as object)) return '[Circular]';
        seen.add(cur as object);
        if (typeof HTMLElement !== 'undefined' && cur instanceof HTMLElement) return `[HTMLElement ${cur.tagName.toLowerCase()}]`;
      }
      if (typeof cur === 'function') return '[Function]';
      return cur;
    }, space);
    return text === undefined ? String(value) : text;
  } catch { return String(value); }
}
const propsText = computed(() => safeJsonStringify(options.value, 2));
</script>
<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <LineLayer v-if="supported && mounted" v-bind="options" :data="LINE_DATA" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>LineLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <span :class="`cap-tag ${presence === 'present' ? 'ok' : 'no'}`">{{ PRESENCE_TEXT[presence] }}</span>
        <p class="muted small">@since 4.0。线图层，继承 NormalLayer 的公共参数。</p>
        <p class="muted small">
          左边是能力矩阵（按版本硬编码）的结论，右边是运行时在 SDK 上探测 <code>LineLayer</code> 构造函数的结果。
          两者不一致说明能力矩阵与实际 SDK 有偏差，此时图层会被静默跳过。
        </p>
      </section>

      <section>
        <h3>挂载</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="mounted" />挂载图层（勾掉验证 removeLayer 是否干净卸载）</label>
      </section>

      <section>
        <h3>style（JSON）</h3>
        <div class="btn-group">
          <button v-for="preset in STYLE_PRESETS" :key="preset.label" :class="{ active: styleText === preset.value }" @click="styleText = preset.value">{{ preset.label }}</button>
        </div>
        <textarea class="full-width" rows="5" v-model="styleText"></textarea>
        <p v-if="parsedStyle.error" class="muted small" style="color:#cf1322">JSON 解析失败：{{ parsedStyle.error }}（本次不下发 style）</p>
        <p v-else class="muted small">解析成功后作为 style 下发，图层会整体重建。</p>
      </section>

      <section>
        <h3>其它参数</h3>
        <label class="checkbox-row" style="justify-content:space-between">idKey
          <input style="width:120px" v-model="idKey" placeholder="默认" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">crs
          <input style="width:120px" v-model="crs" placeholder="默认" />
        </label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked</label>
      </section>

      <section>
        <h3>公共参数</h3>
        <label class="checkbox-row"><input type="checkbox" :checked="base.visible !== false" @change="base.visible = ($event.target as HTMLInputElement).checked" />visible</label>
        <label class="checkbox-row" style="justify-content:space-between">opacity: {{ base.opacity ?? '默认' }}
          <input type="range" min="0" max="1" step="0.1" :value="base.opacity ?? 1" @input="base.opacity = +($event.target as HTMLInputElement).value" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">minZoom
          <input type="number" style="width:80px" :value="base.minZoom ?? ''" @input="base.minZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">maxZoom
          <input type="number" style="width:80px" :value="base.maxZoom ?? ''" @input="base.maxZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">zIndex
          <input type="number" style="width:80px" :value="base.zIndex ?? ''" @input="base.zIndex = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <button class="reset-btn" @click="resetBase">重置公共参数</button>
        <p class="muted small">图层无 setter，改动通过 layerKey 触发重建；页面未使用手写 key。</p>
      </section>

      <section>
        <h3>当前 Props</h3>
        <pre class="props-view">{{ propsText }}</pre>
      </section>

      <section>
        <h3>说明</h3>
        <p class="muted small">
          本页通过 <code>:data</code> 传入一条示例 LineString，LineLayer 会调用 setData 渲染成折线；
          改样式（strokeColor/strokeWeight/strokeStyle 等）会重建图层即时生效。
        </p>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">{{ CODE }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
.props-view { font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
