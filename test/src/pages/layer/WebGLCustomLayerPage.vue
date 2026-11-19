<script setup lang="ts">
/**
 * WebGLCustomLayer 测试页 — v4+ Visualization。自写着色器图层。
 * 极简点云 demo：attributes a_pos（type='lnglat' 自动投影到图层局部坐标）+ uniforms u_color / u_size，
 * draw {mode:'POINTS'} 声明式绘制一次；着色器源码以字符串写在 script 里。
 *
 * 组件方式：
 * <WebGLCustomLayer :vertex-shader="vs" :fragment-shader="fs"
 *   :attributes="{ a_pos: { data: [[lng, lat], ...], type: 'lnglat' } }"
 *   :uniforms="{ u_color: [1, 0.2, 0.35, 1], u_size: 24 }"
 *   :draw="{ mode: 'POINTS' }" :refer-center="center" />
 */
import { computed, ref } from 'vue';
import { Map, WebGLCustomLayer, useCapabilities, type WebGLCustomLayerRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

const POINT_COUNT = 200;
const COLORS: Record<string, number[]> = {
  蓝: [0.09, 0.56, 1, 1],
  橙: [1, 0.55, 0.09, 1],
  绿: [0.32, 0.72, 0.1, 1],
  红: [1, 0.2, 0.35, 1],
};

const caps = useCapabilities();
const supported = computed(() => caps.value.has('WebGLCustomLayer'));

const visible = ref(true);
const size = ref(24);
const { eventLog, log } = useLog();

// ─── 着色器（SDK 自动注入 u_mvpMatrix / u_pixelRatio / u_opacity；animation 时推进 u_time） ───
const VERTEX_SHADER = `
  attribute vec2 a_pos;
  uniform mat4 u_mvpMatrix;
  uniform float u_size;
  uniform float u_pixelRatio;
  void main() {
    gl_Position = u_mvpMatrix * vec4(a_pos, 0.0, 1.0);
    gl_PointSize = u_size * u_pixelRatio;
  }
`;
const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec4 u_color;
  uniform float u_opacity;
  void main() {
    gl_FragColor = vec4(u_color.rgb, u_color.a * u_opacity);
  }
`;

// ─── 数据：北京城区随机 200 点 ───
const points = ref<number[][]>([]);
const generatePoints = () => {
  points.value = Array.from({ length: POINT_COUNT }, () => [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15]);
};
generatePoints();

// 初始声明式数据（构造用）。颜色 / 尺寸 / 点位变化走 ref 句柄，避免重建图层
const attributes = { a_pos: { data: points.value, type: 'lnglat' } };
const uniforms = { u_color: [...COLORS.蓝], u_size: 24 };
const draw = { mode: 'POINTS' };

const webglRef = ref<WebGLCustomLayerRef | null>(null);

// ─── 生命周期回调（onReady / onRender / onDestroy 拿到同一个 CustomRenderContext） ───
const onReady = (ctx: any) => {
  log(`onReady: 着色器编译通过，声明式资源已就位（getStatus=${ctx.getStatus?.() ?? 'ready'}）`);
};
const onError = (err: any) => {
  log(`onError: ${err?.type ?? ''} ${err?.message ?? ''}${err?.source ? ` source=${err.source}` : ''}`);
};
const onDestroy = () => { log('onDestroy'); };

// ─── ref 句柄（expose 返回 WebGLCustomLayerRef 对象，方法名对齐 JSAPI） ───
const changeColor = (name: string) => {
  webglRef.value?.setUniforms({ u_color: COLORS[name] });
  log(`setUniforms({ u_color: [${COLORS[name].join(', ')}] }) → ${name}`);
};
const changeSize = (n: number) => {
  size.value = n;
  webglRef.value?.setUniform('u_size', n);
};
const regenerate = () => {
  generatePoints();
  webglRef.value?.setAttributes({ a_pos: { data: points.value, type: 'lnglat' } });
  log(`setAttributes a_pos → 新 ${POINT_COUNT} 点（运行时路径，不重建图层）`);
};
const callGetStatus = () => { const s = webglRef.value?.getStatus?.(); log(`getStatus → ${s ?? 'pending'}`); };
const callGetContext = () => { const c = webglRef.value?.getContext?.(); log(`getContext → ${c ? 'CustomRenderContext 可用' : 'null（未就绪）'}`); };
const callSetDraw = () => { webglRef.value?.setDraw({ mode: 'POINTS' }); log('setDraw({ mode: "POINTS" })'); };
const resetAll = () => {
  visible.value = true; size.value = 24;
  webglRef.value?.setUniforms({ u_color: [...COLORS.蓝], u_size: 24 });
  regenerate();
};

const CODE_SAMPLE = `// 顶点用图层局部坐标（相对 referCenter 的墨卡托米），a_pos type='lnglat' 自动投影
const vs = \`
  attribute vec2 a_pos;
  uniform mat4 u_mvpMatrix;
  uniform float u_size;
  uniform float u_pixelRatio;
  void main() {
    gl_Position = u_mvpMatrix * vec4(a_pos, 0.0, 1.0);
    gl_PointSize = u_size * u_pixelRatio;
  }
\`;
const fs = \`
  precision mediump float;
  uniform vec4 u_color;
  uniform float u_opacity;
  void main() {
    gl_FragColor = vec4(u_color.rgb, u_color.a * u_opacity);
  }
\`;

<Map :default-center="center" :default-zoom="12">
  <WebGLCustomLayer
    ref="gl"
    :vertex-shader="vs"
    :fragment-shader="fs"
    :attributes="{ a_pos: { data: [[116.4, 39.9], /* ... N 个点 */], type: 'lnglat' } }"
    :uniforms="{ u_color: [0.09, 0.56, 1, 1], u_size: 24 }"
    :draw="{ mode: 'POINTS' }"
    :refer-center="center"
    :on-ready="(ctx) => console.log('ready', ctx)"
    :on-error="(err) => console.error(err)"
  />
</Map>

// 命令式句柄（构造参数 ⇄ 运行时方法对等，走运行时路径不重建图层）
gl.value?.setUniforms({ u_color: [1, 0.2, 0.35, 1] });
gl.value?.setUniform('u_size', 40);
gl.value?.setAttributes({ a_pos: { data: newPoints, type: 'lnglat' } });
gl.value?.setDraw({ mode: 'POINTS' });
gl.value?.getStatus();   // 'pending' | 'ready' | 'error'
gl.value?.getContext();  // CustomRenderContext（与 onReady 拿到的是同一个）`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <WebGLCustomLayer
          v-if="visible && supported"
          ref="webglRef"
          :vertex-shader="VERTEX_SHADER"
          :fragment-shader="FRAGMENT_SHADER"
          :attributes="attributes"
          :uniforms="uniforms"
          :draw="draw"
          :refer-center="BEIJING"
          :on-ready="onReady"
          :on-destroy="onDestroy"
          :on-error="onError"
        />
      </Map>
      <EventLog :log="eventLog" hint="onReady / onDestroy / onError 生命周期 + ref 句柄操作日志" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>WebGLCustomLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('WebGLCustomLayer') ? 'ok' : 'no'}`">{{ caps.has('WebGLCustomLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。自写着色器图层：给 GLSL 源码 + 声明式数据（attributes / vertices / indices / uniforms / textures / draw / renderState），即可在地图的 GL 上下文里绘制。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <p class="muted small">本页构造项变化（含 visible）→ 重建图层，日志可见 onDestroy → onReady；逐帧更新请走 ref 句柄。</p>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成（setAttributes）</button>
        </div>
        <p class="muted small">当前 {{ points.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05。a_pos type='lnglat' 自动投影到图层局部坐标（相对 referCenter）。</p>
      </section>

      <section>
        <h3>u_color（点颜色，setUniforms）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(c, name) in COLORS" :key="name" style="font-size:11px" :style="{ background: `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},1)`, color: '#fff' }" @click="changeColor(name)">{{ name }}</button>
        </div>
      </section>

      <section>
        <h3>u_size（点尺寸）: {{ size }}px</h3>
        <input type="range" min="2" max="80" :value="size" @input="changeSize(+($event.target as HTMLInputElement).value)" class="full-width" />
        <p class="muted small">gl_PointSize = u_size * u_pixelRatio（SDK 自动注入 u_pixelRatio），setUniform 走运行时路径不重建。</p>
      </section>

      <section>
        <h3>ref 句柄（命令式）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="callGetStatus">getStatus</button>
          <button style="font-size:11px" @click="callGetContext">getContext</button>
          <button style="font-size:11px" @click="callSetDraw">setDraw（POINTS）</button>
        </div>
        <p class="muted small">通过 &lt;WebGLCustomLayer ref="webglRef"&gt; 取组件 expose 的 WebGLCustomLayerRef 对象：setUniforms / setUniform / setAttributes / setDraw / getStatus / getContext / projectToLayer / startAnimation / stopAnimation，方法名对齐 JSAPI WebGLCustomLayer。</p>
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
