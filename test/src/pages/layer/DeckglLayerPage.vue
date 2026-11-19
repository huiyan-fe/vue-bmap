<script setup lang="ts">
/**
 * DeckglLayer 测试页 — v4+，依赖 deck.gl（宿主引入，本库不打包）。
 * deck.gl 需挂到 window.deck（@deck.gl/core 或全量 dist 包的 UMD 全局）。
 * 页面提供 CDN 按需加载（与 ThreeLayerPage 同款守卫）：未就绪时只显示
 * 「需宿主引入 deck.gl」提示，不渲染图层 —— 避免 SDK 构造异常被工厂吞掉后静默无图层。
 *
 * 组件方式：
 * <DeckglLayer ref="deck" :data="{ layers: [new deck.ScatterplotLayer({...})] }"
 *   :on-init="(deck, layer) => {}" :on-error="(err) => {}" :on-destroy="(deck, layer) => {}" />
 */
import { computed, onMounted, ref } from 'vue';
import { Map, DeckglLayer, useCapabilities, type DeckglLayerRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

const POINT_COUNT = 200;
/** deck.gl 8.9.x 全量 UMD 包（暴露 window.deck，含 deck.Deck / deck.ScatterplotLayer）。
 *  8.9.x 是 SDK DeckglLayer 支持的最高版本（9.x 起 deck 不再支持地图所用 GL 上下文），
 *  官方参考 demo 固定 8.9.36，这里保持一致。 */
const DECK_CDN = 'https://unpkg.com/deck.gl@8.9.36/dist.min.js';

type DeckAny = any;
type DeckStatus = 'idle' | 'loading' | 'ready' | 'error';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('DeckglLayer'));

const visible = ref(true);

// ─── deck.gl 依赖守卫（对齐 ThreeLayerPage：类存在 ≠ 能构造成功） ───
let deckPromise: Promise<void> | null = null;
function loadDeck(): Promise<void> {
  if ((globalThis as DeckAny).deck?.Deck) return Promise.resolve();
  if (deckPromise) return deckPromise;
  deckPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DECK_CDN;
    script.async = true;
    script.onload = () => ((globalThis as DeckAny).deck?.Deck ? resolve() : reject(new Error('脚本已加载但 window.deck 不存在')));
    script.onerror = () => reject(new Error(`加载失败：${DECK_CDN}`));
    document.head.appendChild(script);
  });
  deckPromise = deckPromise.catch((err) => { deckPromise = null; throw err; });
  return deckPromise;
}

const deckStatus = ref<DeckStatus>((globalThis as DeckAny).deck?.Deck ? 'ready' : 'idle');
const deckError = ref('');
const { eventLog, log } = useLog();

const requestDeck = () => {
  deckStatus.value = 'loading';
  deckError.value = '';
  loadDeck().then(
    () => { deckStatus.value = 'ready'; refreshData(); log('deck.gl 已就绪，图层数据已就位'); },
    (err: Error) => { deckStatus.value = 'error'; deckError.value = err.message; log(`deck.gl 加载失败：${err.message}`); },
  );
};
onMounted(() => { if (deckStatus.value === 'idle') requestDeck(); });

// ─── 数据：北京城区随机 200 点 ───
const points = ref<number[][]>([]);
const generatePoints = () => {
  points.value = Array.from({ length: POINT_COUNT }, () => [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15]);
};
generatePoints();

const radius = ref(200);
/** 极简 deck ScatterplotLayer：data 变化时组件内部调 raw.setProps()，不重建 Deck */
const deckData = ref<Record<string, unknown> | undefined>(undefined);

const buildDeckData = (radiusScale = 1) => {
  const deck = (globalThis as DeckAny).deck;
  if (!deck?.ScatterplotLayer) return undefined;
  const data = points.value.map((p, i) => ({
    position: p,
    color: i % 4 === 0 ? [255, 140, 0, 220] : [24, 144, 255, 220],
    r: radius.value * radiusScale * (0.5 + Math.random() * 0.9),
  }));
  return {
    layers: [new deck.ScatterplotLayer({
      id: 'scatter',
      data,
      getPosition: (d: DeckAny) => d.position,
      getFillColor: (d: DeckAny) => d.color,
      getRadius: (d: DeckAny) => d.r,
      radiusUnits: 'meters',
      radiusMinPixels: 3,
      stroked: false,
    })],
  };
};

const refreshData = () => {
  const built = buildDeckData();
  if (!built) return;
  deckData.value = built;
  log(`deck 数据已重建：${POINT_COUNT} 点（半径基准 ${radius.value}m，data 变化 → setProps）`);
};

const regenerate = () => { generatePoints(); refreshData(); };

// deck 已在全局（宿主引入 / 刷新后 CDN 全局仍在）时 setup 阶段直接构建数据
if ((globalThis as DeckAny).deck?.Deck) refreshData();

// ─── 生命周期回调（SDK 回调签名 onInit(deck, layer) / onError(err) / onDestroy(deck, layer)） ───
const deckRef = ref<DeckglLayerRef | null>(null);
const onInit = (deck: DeckAny) => { log(`onInit: Deck 实例已创建（${!!deck}）`); };
const onError = (err: DeckAny) => { log(`onError: ${err?.type ?? ''} ${err?.message ?? ''}`); };
const onDestroy = () => { log('onDestroy'); };

// ─── ref 句柄（expose 返回 DeckglLayerRef 对象） ───
const callSetProps = () => {
  const built = buildDeckData(2); // 半径翻倍
  if (!built) { log('setProps 跳过：window.deck 不可用'); return; }
  deckRef.value?.setProps(built);
  log('setProps({ layers: 半径翻倍后的新 ScatterplotLayer })');
};
const callGetStatus = () => { const s = deckRef.value?.getStatus?.(); log(`getStatus → ${s ?? 'pending'}`); };
const callGetDeck = () => { const d = deckRef.value?.getDeck?.(); log(`getDeck → ${d ? 'Deck 实例存在' : 'null（GL 未就绪）'}`); };

const DECK_TAG: Record<DeckStatus, string> = {
  idle: 'deck.gl 未加载', loading: 'deck.gl 加载中', ready: 'deck.gl 已就绪', error: 'deck.gl 加载失败',
};

const resetAll = () => { visible.value = true; radius.value = 200; regenerate(); };

const CODE_SAMPLE = `// deck.gl 需宿主工程自行引入并挂到 window.deck（本页可点上方按钮加载 CDN 全量包）
const deckData = {
  layers: [
    new deck.ScatterplotLayer({
      id: 'scatter',
      data: [{ position: [116.404, 39.915] }, /* ... N 个点 */],
      getPosition: (d) => d.position,
      getFillColor: [24, 144, 255, 220],
      getRadius: 200,
      radiusUnits: 'meters',   // 米制半径（随缩放变化），radiusMinPixels 兜底最小像素
      radiusMinPixels: 3,
    }),
  ],
};

<Map :default-center="center" :default-zoom="12">
  <DeckglLayer
    ref="deck"
    :data="deckData"          <!-- data 变化 → 组件内部 setProps，不重建 Deck -->
    :on-init="(deck, layer) => console.log('ready', deck)"
    :on-error="(err) => console.error(err)"
    :on-destroy="(deck, layer) => console.log('destroyed')"
  />
</Map>

// 命令式句柄（expose 返回 DeckglLayerRef 对象，方法名对齐 JSAPI DeckglLayer）
deck.value?.setProps({ layers: [/* 新的 deck 图层 */] });
deck.value?.getStatus();      // 'pending' | 'ready' | 'error'
deck.value?.getDeck();        // 内部 Deck 实例（GL 就绪前为 null）
deck.value?.startAnimation(); deck.value?.stopAnimation();`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <DeckglLayer
          v-if="supported && deckStatus === 'ready' && deckData"
          ref="deckRef"
          :data="deckData"
          :visible="visible"
          :on-init="onInit"
          :on-error="onError"
          :on-destroy="onDestroy"
        />
      </Map>
      <EventLog :log="eventLog" hint="onInit / onError / onDestroy 生命周期 + ref 句柄操作日志" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>DeckglLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('DeckglLayer') ? 'ok' : 'no'}`">{{ caps.has('DeckglLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。deck.gl 接入图层：data 传 deck props（最常用 { layers: [...] }），变化时组件内部调 setProps()，不重建 Deck 实例。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（setVisible，不卸载重建）</label>
      </section>

      <section>
        <h3>deck.gl 依赖</h3>
        <span :class="`cap-tag ${deckStatus === 'ready' ? 'ok' : 'no'}`">{{ DECK_TAG[deckStatus] }}</span>
        <div class="btn-group">
          <button :disabled="deckStatus === 'loading' || deckStatus === 'ready'" @click="requestDeck">加载 deck.gl</button>
        </div>
        <p v-if="deckError" class="muted small" style="color:#cf1322">{{ deckError }}</p>
        <p class="muted small">
          CDN：<code>{{ DECK_CDN }}</code>（deck.gl 8.x 全量 UMD 包，暴露 window.deck）。deck.gl 应由宿主工程引入并挂到全局；
          SDK 构造函数第一行检查 window.deck，缺失时异常被工厂吞掉、图层静默变 null —— 未就绪时本页不渲染图层，
          只显示「需宿主引入 deck.gl」提示。
        </p>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ points.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05。data 变化时组件内部调用 setProps()，不重建 Deck。</p>
      </section>

      <section>
        <h3>radius（半径基准）: {{ radius }}m</h3>
        <input type="range" min="50" max="600" step="10" :value="radius" @input="radius = +($event.target as HTMLInputElement).value" @change="refreshData" class="full-width" />
        <p class="muted small">拖动松手后按新半径重建数据（data 变化 → setProps）；radiusUnits='meters' 时半径随缩放变化，radiusMinPixels 兜底最小像素。</p>
      </section>

      <section>
        <h3>ref 句柄（命令式）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="callSetProps">setProps（半径翻倍）</button>
          <button style="font-size:11px" @click="callGetStatus">getStatus</button>
          <button style="font-size:11px" @click="callGetDeck">getDeck</button>
        </div>
        <p class="muted small">通过 &lt;DeckglLayer ref="deckRef"&gt; 取组件 expose 的 DeckglLayerRef 对象：setProps() / getStatus() / getDeck() / startAnimation() / stopAnimation()，方法名对齐 JSAPI DeckglLayer。</p>
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
