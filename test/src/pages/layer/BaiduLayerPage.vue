<script setup lang="ts">
/** BaiduLayer 测试页 — v4+。百度底图图层。 */
import { computed, reactive, ref } from 'vue';
import { Map, BaiduLayer, useCapabilities, useDriver } from '@baidumap/vue-bmap';
import type { BaiduLayerProps } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const driver = useDriver();
const supported = computed(() => caps.value.has('BaiduLayer'));
const presence = computed<'present' | 'missing' | 'unknown'>(() => {
  const d = driver.value;
  if (!d) return 'unknown';
  const raw = d.rawSDK as Record<string, unknown> | null | undefined;
  if (!raw) return 'unknown';
  return typeof raw['BaiduLayer'] === 'function' ? 'present' : 'missing';
});
const PRESENCE_TEXT: Record<'present' | 'missing' | 'unknown', string> = {
  present: 'SDK 类存在', missing: 'SDK 类缺失', unknown: 'SDK 未就绪',
};

const mounted = ref(true);
const options = reactive<BaiduLayerProps>({ visible: true });
const resetBase = () => { options.visible = true; options.opacity = undefined; options.minZoom = undefined; options.maxZoom = undefined; options.zIndex = undefined; };
const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const CODE = `<Map :default-center="center" :default-zoom="11">
  <BaiduLayer visible :opacity="0.6" />
</Map>`;

function safeJsonStringify(value: unknown, space?: number): string {
  const seen = new WeakSet<object>();
  try {
    const text = JSON.stringify(value, (_k, cur) => {
      if (typeof cur === 'object' && cur !== null) {
        if (seen.has(cur as object)) return '[Circular]';
        seen.add(cur as object);
      }
      if (typeof cur === 'function') return '[Function]';
      return cur;
    }, space);
    return text === undefined ? String(value) : text;
  } catch { return String(value); }
}
const propsText = computed(() => safeJsonStringify(options, 2));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <BaiduLayer v-if="supported && mounted" v-bind="options" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>BaiduLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <span :class="`cap-tag ${presence === 'present' ? 'ok' : 'no'}`">{{ PRESENCE_TEXT[presence] }}</span>
        <p class="muted small">@since 4.0。百度图层，叠在底图之上，调 opacity 最容易看出差异。</p>
        <p class="muted small">
          左边是能力矩阵（按版本硬编码）的结论，右边是运行时在 SDK 上探测 <code>BaiduLayer</code> 构造函数的结果。
          两者不一致说明能力矩阵与实际 SDK 有偏差，此时图层会被静默跳过。
        </p>
      </section>

      <section>
        <h3>挂载</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="mounted" />挂载图层（勾掉验证 removeLayer 是否干净卸载）</label>
      </section>

      <section>
        <h3>公共参数</h3>
        <label class="checkbox-row"><input type="checkbox" :checked="options.visible !== false" @change="options.visible = ($event.target as HTMLInputElement).checked" />visible</label>
        <label class="checkbox-row" style="justify-content:space-between">opacity: {{ options.opacity ?? '默认' }}
          <input type="range" min="0" max="1" step="0.1" :value="options.opacity ?? 1" @input="options.opacity = +($event.target as HTMLInputElement).value" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">minZoom
          <input type="number" style="width:80px" :value="options.minZoom ?? ''" @input="options.minZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">maxZoom
          <input type="number" style="width:80px" :value="options.maxZoom ?? ''" @input="options.maxZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row" style="justify-content:space-between">zIndex
          <input type="number" style="width:80px" :value="options.zIndex ?? ''" @input="options.zIndex = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <button class="reset-btn" @click="resetBase">重置公共参数</button>
        <p class="muted small">图层无 setter，改动通过 layerKey 触发重建；页面未使用手写 key。</p>
      </section>

      <section>
        <h3>当前 Props</h3>
        <pre class="props-view">{{ propsText }}</pre>
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
