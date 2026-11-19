<script setup lang="ts">
/**
 * TextLayer 测试页 — v4+ Visualization。文本图层。
 * 支持 setData（GeoJSON 点数据）、text（字符串 / 函数，不传读 properties.text）、字号 / 颜色 / 碰撞剔除 / 锚点等。
 *
 * 组件方式：
 * <TextLayer :data="geojson" :font-size="14" color="#333" :collides="true" anchor="center" :enable-picked="true" :on-click="onClick" />
 */
import { computed, ref } from 'vue';
import { Map, TextLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';
import { randomPoints } from './geoHelper';

const TEXT_COUNT = 200;
const COLORS = ['#333333', '#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];
const ANCHORS = ['center', 'topLeft', 'topCenter', 'topRight', 'rightCenter', 'bottomRight', 'bottomCenter', 'bottomLeft', 'leftCenter'] as const;
const TEXT_MODES = [
  { label: '默认（properties.text）', value: 'auto' },
  { label: '字符串', value: 'string' },
  { label: '函数', value: 'fn' },
] as const;

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TextLayer'));

const visible = ref(true);
const enablePicked = ref(true);

// ─── 数据生成：北京城区 200 个随机点，properties 带 id/name/text（text 供默认文案读取） ───
const textData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => { textData.value = randomPoints(TEXT_COUNT, true); };
generateData();

const regenerate = () => { generateData(); log(`重新生成 ${TEXT_COUNT} 个点`); };

// ─── 样式 ───
const textMode = ref<'auto' | 'string' | 'fn'>('auto');
/** text 为字符串或函数 (properties) => string；不传时读要素的 properties.text（本页数据 text 与 name 同值） */
const textProp = computed(() => {
  if (textMode.value === 'auto') return undefined;
  if (textMode.value === 'string') return '文本图层';
  return (p: any) => `${p?.name ?? ''}·${p?.id ?? ''}`;
});
const fontSize = ref(14);
const color = ref(COLORS[0]);
const collides = ref(true);
const anchor = ref<(typeof ANCHORS)[number]>('center');

// ─── 事件日志：事件对象带 value / pixel / latLng（需 enablePicked=true） ───
const { eventLog, log, fmt } = useLog();

const onTextClick = (e: any) => {
  const v = e?.value;
  log(`click 「${v?.text ?? ''}」id=${v?.id ?? '-'} @ ${fmt(e?.latLng)}`);
};
const onTextMouseOver = (e: any) => {
  const v = e?.value;
  log(`mouseover 「${v?.text ?? ''}」id=${v?.id ?? '-'}`);
};
const onTextMouseOut = (e: any) => {
  const v = e?.value;
  log(`mouseout 「${v?.text ?? ''}」id=${v?.id ?? '-'}`);
};
const onTextMouseMove = (e: any) => {
  const v = e?.value;
  log(`mousemove 「${v?.text ?? ''}」id=${v?.id ?? '-'} @ ${fmt(e?.latLng)}`);
};

const resetAll = () => {
  visible.value = true; enablePicked.value = true;
  textMode.value = 'auto'; fontSize.value = 14; color.value = COLORS[0]; collides.value = true; anchor.value = 'center';
  generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, name: '点1', text: '点1' } },
    // ... N 个点（不传 text 时读 properties.text 作为默认文案）
  ],
};

<Map :default-center="center" :default-zoom="12">
  <TextLayer
    :data="geojson"
    :font-size="14"
    color="#333"
    :collides="true"
    anchor="center"
    :enable-picked="true"
    :text="(p) => p.name"   // 字符串或函数；不传读 properties.text（本页 text=name）
    :on-click="(e) => console.log(e.value, e.pixel, e.latLng)"
    :on-mouse-over="(e) => console.log(e.value)"
    :on-mouse-out="(e) => console.log(e.value)"
    :on-mouse-move="(e) => console.log(e.value)"
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <TextLayer
          v-if="visible && supported"
          :data="textData"
          :text="textProp"
          :font-size="fontSize"
          :color="color"
          :collides="collides"
          :anchor="anchor"
          :enable-picked="enablePicked"
          :on-click="onTextClick"
          :on-mouse-over="onTextMouseOver"
          :on-mouse-out="onTextMouseOut"
          :on-mouse-move="onTextMouseMove"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停文字触发事件（需开启 enablePicked）" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>TextLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('TextLayer') ? 'ok' : 'no'}`">{{ caps.has('TextLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。文本图层，批量绘制 GeoJSON 点（Point / MultiPoint）文字标注，支持碰撞剔除。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked（鼠标拾取 + 事件派发，重建）</label>
        <p class="muted small">不开 enablePicked 时点击 / 悬停不会派发事件。</p>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ textData.features.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05，properties 带 id/name（text 与 name 同值）。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>text（文案来源）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="m in TEXT_MODES" :key="m.value" :class="{ active: textMode === m.value }" style="font-size:11px" @click="textMode = m.value">{{ m.label }}</button>
        </div>
        <p class="muted small">不传 text 时读要素的 properties.text（本页数据 text 与 name 同值，即默认取名称）；字符串对所有点生效；函数签名为 (properties, feature, index) => string。</p>
      </section>

      <section>
        <h3>fontSize（字号）: {{ fontSize }}px</h3>
        <input type="range" min="8" max="40" :value="fontSize" @input="fontSize = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>color（文字颜色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: color === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="color = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>collides（碰撞剔除）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="collides" />密集时自动隐藏互相压盖的文字</label>
        <p class="muted small">关闭后文字全部显示，可能互相重叠。</p>
      </section>

      <section>
        <h3>anchor（锚点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="a in ANCHORS" :key="a" :class="{ active: anchor === a }" style="font-size:11px" @click="anchor = a">{{ a }}</button>
        </div>
        <p class="muted small">决定坐标点落在文字的哪个位置，默认 center。</p>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">{{ CODE_SAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
