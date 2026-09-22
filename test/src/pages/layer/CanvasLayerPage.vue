<script setup lang="ts">
/**
 * CanvasLayer 测试页 — 自定义 Canvas 图层。
 * dts 标记 @removed 4.0（v3-only），v4 下不可用。
 * 需要 update 回调来绘制内容。
 */
import { computed, ref } from 'vue';
import { Map, CanvasLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('CanvasLayer'));
const visible = ref(true);
const zIndex = ref<number | undefined>(undefined);
const colorIdx = ref(0);

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

// update 回调：SDK 调用时 this 是 CanvasLayer 实例，通过 this.canvas 获取 canvas
const update = computed(() => {
  const idx = colorIdx.value;
  return function (this: any) {
    const canvas = this?.canvas as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const color = COLORS[idx];
    for (let i = 0; i < 5; i++) {
      const cx = w * (0.2 + i * 0.15);
      const cy = h * (0.3 + Math.sin(i) * 0.2);
      const r = 40 + i * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
});

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="11">
  <CanvasLayer
    :z-index="5"
    :update="function() {
      var ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#1890ff33';
      ctx.fillRect(100, 100, 200, 200);
    }"
  />
</Map>`;

const resetAll = () => { visible.value = true; zIndex.value = undefined; colorIdx.value = 0; };
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <CanvasLayer v-if="visible && supported" :key="colorIdx" :z-index="zIndex" :update="update" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>CanvasLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">
          自定义 Canvas 图层。dts 标记 @removed 4.0（v3-only），v4 下不可用。
          需要 update 回调绘制内容。
        </p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>update 回调（绘制内容）</h3>
        <p class="muted small">update 回调接收 CanvasRenderingContext2D，在 canvas 上绘制自定义内容。</p>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(c, i) in COLORS" :key="c" :class="{ active: colorIdx === i }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="colorIdx = i">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>zIndex</h3>
        <input type="number" placeholder="未设置" :value="zIndex ?? ''" @input="zIndex = numOrUndef(($event.target as HTMLInputElement).value)" />
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
