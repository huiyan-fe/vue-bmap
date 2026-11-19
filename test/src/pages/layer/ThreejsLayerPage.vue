<script setup lang="ts">
/**
 * ThreejsLayer 测试页 — v4+，依赖 three.js（宿主引入，本库不打包）。
 * three.js 需挂到 window.THREE；页面提供 CDN 按需加载（对齐 ThreeLayerPage 的守卫）：
 * 未就绪时不渲染图层，只显示提示 —— 避免 SDK 构造异常被工厂吞掉后静默无图层。
 *
 * 组件方式（立方体 + onRender 旋转）：
 * <ThreejsLayer ref="t" :animation="true" :refer-center="center"
 *   :on-init="(ctx) => { const [x, y] = ctx.projectToLayer([center.lng, center.lat]);
 *     const mesh = new THREE.Mesh(new THREE.BoxGeometry(500,500,500), new THREE.MeshBasicMaterial({ color: 0x1890ff }));
 *     mesh.position.set(x, y, 250); ctx.layer.add(mesh); }"
 *   :on-render="(ctx) => { mesh.rotation.y += 0.01; ctx.renderer.render(ctx.scene, ctx.camera); }" />
 */
import { computed, onMounted, ref } from 'vue';
import { Map, ThreejsLayer, useCapabilities, type ThreejsLayerRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

const CUBE_SIZE = 500;
/** r150+ 已移除 build/three.min.js，这里固定用最后一个带 UMD 全局的版本 */
const THREE_CDN = 'https://unpkg.com/three@0.137.5/build/three.min.js';

type ThreeAny = any;
type ThreeStatus = 'idle' | 'loading' | 'ready' | 'error';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('ThreejsLayer'));

const mounted = ref(true);
const visible = ref(true);
const alpha = ref(false);
const antialias = ref(true);
/** onRender 接管渲染 + animation 逐帧重绘才有连续旋转 */
const animation = ref(true);
const cubeOn = ref(true);
const rotationSpeed = ref(0.01);

const { eventLog, log } = useLog();

// ─── three.js 依赖守卫 ───
let threePromise: Promise<void> | null = null;
function loadThree(): Promise<void> {
  if ((window as ThreeAny).THREE) return Promise.resolve();
  if (threePromise) return threePromise;
  threePromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = THREE_CDN;
    script.async = true;
    script.onload = () => ((window as ThreeAny).THREE ? resolve() : reject(new Error('脚本已加载但 window.THREE 不存在')));
    script.onerror = () => reject(new Error(`加载失败：${THREE_CDN}`));
    document.head.appendChild(script);
  });
  threePromise = threePromise.catch((err) => { threePromise = null; throw err; });
  return threePromise;
}

const threeStatus = ref<ThreeStatus>((window as ThreeAny).THREE ? 'ready' : 'idle');
const threeError = ref('');

const requestThree = () => {
  threeStatus.value = 'loading';
  threeError.value = '';
  loadThree().then(
    () => { threeStatus.value = 'ready'; log('three.js 已就绪'); },
    (err: Error) => { threeStatus.value = 'error'; threeError.value = err.message; log(`three.js 加载失败：${err.message}`); },
  );
};
onMounted(() => { if (threeStatus.value === 'idle') requestThree(); });

// ─── 场景内容：立方体 + onRender 旋转 ───
const threeRef = ref<ThreejsLayerRef | null>(null);
let currentMesh: ThreeAny = null;

/** target 可能是 onInit 的 ctx（图层在 ctx.layer 上）或组件 ref 句柄（本身就是图层） */
const addCube = (target: ThreeAny) => {
  if (!target) return;
  const THREE = (window as ThreeAny).THREE;
  if (!THREE) return;
  const layer = target.layer ?? target;
  const projectToLayer = target.projectToLayer
    ? target.projectToLayer.bind(target)
    : layer.projectToLayer?.bind(layer);
  if (!projectToLayer || typeof layer?.add !== 'function') {
    log('addCube 跳过：target 上找不到 projectToLayer / add');
    return;
  }
  const xy = projectToLayer([BEIJING.lng, BEIJING.lat]);
  const [x, y] = Array.isArray(xy) ? xy : [xy, xy];
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x1890ff }),
  );
  mesh.position.set(Number(x), Number(y), CUBE_SIZE / 2);
  currentMesh = mesh;
  layer.add(mesh);
  log(`立方体已添加：边长 ${CUBE_SIZE}，局部坐标 (${Number(x).toFixed(1)}, ${Number(y).toFixed(1)})`);
};

const removeCube = () => {
  if (!currentMesh) return;
  threeRef.value?.removeObject(currentMesh);
  currentMesh = null;
  log('removeObject 已调用，立方体已移出场景');
};

const toggleCube = (next: boolean) => {
  cubeOn.value = next;
  if (next) addCube(threeRef.value); else removeCube();
};

// ─── 生命周期回调（ctx 与 ref 拿到的是同一个 SDK 实例） ───
const onInit = (ctx: ThreeAny) => {
  log(`onInit: renderer=${!!ctx.renderer} scene=${!!ctx.scene} camera=${!!ctx.camera}`);
  if (cubeOn.value) addCube(ctx);
};
const onRender = (ctx: ThreeAny) => {
  // onRender 接管渲染：SDK 不再自动 renderer.render(scene, camera)，转完必须自己画
  if (currentMesh) {
    currentMesh.rotation.x += rotationSpeed.value;
    currentMesh.rotation.y += rotationSpeed.value * 1.5;
  }
  ctx.renderer.render(ctx.scene, ctx.camera);
};
const onDestroy = () => { log('onDestroy（renderer / scene 随后由 SDK dispose）'); currentMesh = null; };
const onError = (err: ThreeAny) => { log(`onError: ${err?.type ?? ''} ${err?.message ?? ''}`); };

// ─── ref 句柄（expose 返回 ThreejsLayerRef 对象） ───
const callGetStatus = () => { const s = threeRef.value?.getStatus?.(); log(`getStatus → ${s ?? 'pending'}`); };
const callInspect = () => {
  const s = threeRef.value?.getScene?.();
  const c = threeRef.value?.getCamera?.();
  const r = threeRef.value?.getRenderer?.();
  log(`getScene=${!!s} getCamera=${!!c} getRenderer=${!!r}`);
};
const startAnim = () => { threeRef.value?.startAnimation(); log('startAnimation'); };
const stopAnim = () => { threeRef.value?.stopAnimation(); log('stopAnimation'); };

const THREE_TAG: Record<ThreeStatus, string> = {
  idle: 'three.js 未加载', loading: 'three.js 加载中', ready: 'three.js 已就绪', error: 'three.js 加载失败',
};

const resetAll = () => {
  mounted.value = true; visible.value = true; alpha.value = false; antialias.value = true;
  animation.value = true; cubeOn.value = true; rotationSpeed.value = 0.01;
};

const CODE_SAMPLE = `// three.js 需宿主工程自行引入并挂到 window.THREE（本页可点按钮加载 CDN 包）
const center = { lng: 116.404, lat: 39.915 };
const layerRef = ref<ThreejsLayerRef>();

<Map :default-center="center" :default-zoom="16">
  <ThreejsLayer
    ref="layerRef"
    :refer-center="center"
    :animation="true"          <!-- onRender 接管渲染 + animation 逐帧重绘才有连续旋转 -->
    :on-init="(ctx) => {
      const [x, y] = ctx.projectToLayer([center.lng, center.lat]);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(500, 500, 500),
        new THREE.MeshBasicMaterial({ color: 0x1890ff }),
      );
      mesh.position.set(x, y, 250);
      ctx.layer.add(mesh);      // 或 ctx.scene.add(mesh)
    }"
    :on-render="(ctx) => {
      // onRender 接管渲染：转完必须自己 renderer.render，否则画面不更新
      mesh.rotation.y += 0.01;
      ctx.renderer.render(ctx.scene, ctx.camera);
    }"
  />
</Map>

// 命令式句柄（expose 返回 ThreejsLayerRef 对象，方法名对齐 JSAPI ThreejsLayer）
layerRef.value?.add(mesh);          // 加入场景（GL 未就绪时 SDK 先排队）
layerRef.value?.removeObject(mesh); // 注意不是移除图层的 remove()
layerRef.value?.getStatus();        // 'pending' | 'ready' | 'error'
layerRef.value?.getScene(); layerRef.value?.getCamera(); layerRef.value?.getRenderer();
layerRef.value?.projectToLayer([lng, lat]);`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="16" style="height:100%">
        <ThreejsLayer
          v-if="supported && mounted && threeStatus === 'ready'"
          ref="threeRef"
          :alpha="alpha"
          :antialias="antialias"
          :animation="animation"
          :visible="visible"
          :refer-center="BEIJING"
          :on-init="onInit"
          :on-render="onRender"
          :on-destroy="onDestroy"
          :on-error="onError"
        />
      </Map>
      <EventLog :log="eventLog" hint="onInit / onRender / onDestroy / onError 生命周期 + ref 句柄操作日志" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>ThreejsLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('ThreejsLayer') ? 'ok' : 'no'}`">{{ caps.has('ThreejsLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。three.js 接入图层。SDK 构造函数第一行检查 window.THREE，缺失会 throw、异常被工厂吞掉后图层静默变 null —— 所以上面的能力标签代表矩阵结论，实际能不能用看下方 three.js 状态。v3 不支持。</p>
      </section>

      <section>
        <h3>挂载</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="mounted" />挂载图层（勾掉验证 removeLayer 是否干净卸载）</label>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（走 setVisible setter，不重建 three 场景）</label>
      </section>

      <section>
        <h3>three.js 依赖</h3>
        <span :class="`cap-tag ${threeStatus === 'ready' ? 'ok' : 'no'}`">{{ THREE_TAG[threeStatus] }}</span>
        <div class="btn-group">
          <button :disabled="threeStatus === 'loading' || threeStatus === 'ready'" @click="requestThree">加载 three.js</button>
        </div>
        <p v-if="threeError" class="muted small" style="color:#cf1322">{{ threeError }}</p>
        <p class="muted small">
          CDN：<code>{{ THREE_CDN }}</code>（r150+ 已移除 UMD 包，这里取最后一个带 window.THREE 全局的版本）。
          未就绪时本页不渲染 ThreejsLayer，只显示「需宿主引入 three.js」提示。
        </p>
      </section>

      <section>
        <h3>构造参数</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="alpha" />alpha（THREE.WebGLRenderer）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="antialias" />antialias（THREE.WebGLRenderer）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="animation" />animation（逐帧重绘，旋转动画的前提）</label>
        <p class="muted small">alpha / antialias / animation 变化 → 重建图层（日志可见 onDestroy → onInit）；visible 走 setVisible 不重建。</p>
      </section>

      <section>
        <h3>场景内容</h3>
        <label class="checkbox-row"><input type="checkbox" :checked="cubeOn" @change="toggleCube(($event.target as HTMLInputElement).checked)" />在地图中心放一个立方体（ref 句柄 add / removeObject）</label>
        <label class="checkbox-row" style="justify-content:space-between">旋转速度：{{ rotationSpeed.toFixed(3) }}
          <input type="range" min="0" max="0.05" step="0.001" :value="rotationSpeed" @input="rotationSpeed = +($event.target as HTMLInputElement).value" />
        </label>
        <p class="muted small">
          立方体的增删走 ref 句柄的 add / removeObject 直接改场景，不触发重建；旋转在 onRender 里做
          （onRender 接管渲染，每帧转完自己 renderer.render）。边长单位约等于米（局部坐标来自
          projectToLayer 相对 referCenter 的墨卡托偏移），默认 500、zoom 16 下约数百像素；俯视角看到的是
          顶面，把地图倾斜（setTilt）才能看出体积。
        </p>
      </section>

      <section>
        <h3>ref 句柄（命令式）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="toggleCube(true)">add 立方体</button>
          <button style="font-size:11px" @click="toggleCube(false)">removeObject 立方体</button>
          <button style="font-size:11px" @click="callGetStatus">getStatus</button>
          <button style="font-size:11px" @click="callInspect">getScene/Camera/Renderer</button>
          <button style="font-size:11px" @click="startAnim">startAnimation</button>
          <button style="font-size:11px" @click="stopAnim">stopAnimation</button>
        </div>
        <p class="muted small">通过 &lt;ThreejsLayer ref="threeRef"&gt; 取组件 expose 的 ThreejsLayerRef 对象：add() / removeObject() / getScene() / getCamera() / getRenderer() / getStatus() / projectToLayer() / startAnimation() / stopAnimation()（方法名对齐 JSAPI ThreejsLayer；移除单个对象是 removeObject，不是移除图层的 remove()）。</p>
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
