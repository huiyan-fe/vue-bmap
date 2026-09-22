<script setup lang="ts">
/**
 * MVTLayer 测试页 — v4+。MVT 矢量瓦片图层。
 * 支持 tileUrlTemplate（[z]/[x]/[y] 占位符）、layers 配置、style 样式、事件回调。
 */
import { computed, nextTick, ref, watch } from 'vue';
import { Map, MVTLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('MVTLayer'));
const visible = ref(true);
const url = ref('https://your-mvt-server/[z]/[x]/[y].pbf');
const minZoom = ref<number | undefined>(3);
const maxZoom = ref<number | undefined>(18);
const eventLog = ref<string[]>([]);
const logRef = ref<HTMLDivElement | null>(null);

watch(eventLog, () => { nextTick(() => { if (logRef.value) logRef.value.scrollTop = 0; }); });

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const log = (msg: string) => {
  eventLog.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...eventLog.value].slice(0, 20);
};

const rebuildKey = computed(() => `${url.value}|${minZoom.value ?? ''}|${maxZoom.value ?? ''}`);

const onclick = (e: unknown) => {
  log(`🖱️ click: ${JSON.stringify(e).slice(0, 120)}`);
};

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="11">
  <MVTLayer
    tile-url-template="https://your-mvt-server/[z]/[x]/[y].pbf"
    :min-zoom="3"
    :max-zoom="18"
    :onclick="(e) => { /* MVT click event */ }"
    :onmousemove="(e) => { /* MVT hover event */ }"
  />
</Map>`;

const resetAll = () => { visible.value = true; url.value = 'https://your-mvt-server/[z]/[x]/[y].pbf'; minZoom.value = 3; maxZoom.value = 18; };
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <MVTLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :tile-url-template="url"
          :min-zoom="minZoom"
          :max-zoom="maxZoom"
          :onclick="onclick"
        />
      </Map>
      <div ref="logRef" style="position:absolute;left:8px;bottom:50px;max-width:340px;max-height:180px;background:rgba(0,0,0,0.75);color:#0f0;border-radius:6px;padding:8px 8px 14px 8px;font-size:11px;font-family:monospace;overflow-y:auto;z-index:10;border:1px solid rgba(255,255,255,0.15)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.15)">
          <span>事件日志（{{ eventLog.length }}）</span>
          <button @click="eventLog = []" style="background:transparent;border:1px solid #555;color:#aaa;cursor:pointer;font-size:10px;border-radius:3px;padding:0 6px">清空</button>
        </div>
        <div v-if="eventLog.length === 0" style="color:#666">点击 MVT 要素触发事件</div>
        <template v-else>
          <div v-for="(line, i) in eventLog" :key="i" style="line-height:1.6">{{ line }}</div>
        </template>
      </div>
    </div>
    <div class="test-controls">
      <h2>MVTLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。MVT 矢量瓦片图层。支持点/线/面样式配置和要素拾取事件。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>tileUrlTemplate</h3>
        <textarea class="full-width" rows="2" v-model="url"></textarea>
        <p class="muted small">MVT 瓦片 URL 模板，占位符 [z]/[x]/[y]。变化时重建图层。</p>
      </section>

      <section>
        <h3>缩放范围</h3>
        <label class="checkbox-row">minZoom
          <input type="number" placeholder="3" :value="minZoom ?? ''" @input="minZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row">maxZoom
          <input type="number" placeholder="18" :value="maxZoom ?? ''" @input="maxZoom = numOrUndef(($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section>
        <h3>事件</h3>
        <p class="muted small">支持 click / dblclick / mousemove / mouseout 事件。onclick 已绑定，点击 MVT 要素查看日志。</p>
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

      <section>
        <h3>高级配置</h3>
        <p class="muted small">
          MVTLayer 还支持 layers（多子图层配置）、style（点/线/面样式）、
          transform（坐标系转换）、noCollision（无碰撞）、useThumb（缩略图）等高级选项。
          详见 SDK dts MVTLayerOptions。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
