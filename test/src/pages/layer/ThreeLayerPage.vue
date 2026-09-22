<script setup lang="ts">
/**
 * ThreeLayer 测试页 — v4+，依赖 three.js。
 *
 * SDK 里 ThreeLayer 的构造函数第一件事就是 `if (!window.THREE) throw`，而工厂会把构造异常吞掉
 * 返回 null。所以本页把 three.js 的加载状态单独列出来：类存在 ≠ 能构造成功。
 * 组件已是手写实现：props 覆盖 alpha / antialias / referCenter 与全部生命周期回调，
 * 场景操作走模板 ref 拿到的命令式句柄（onInit 回调第 4 参也是同一个句柄）。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Map, ThreeLayer, useCapabilities, useDriver } from '@baidumap/vue-bmap';
import type { ThreeLayerRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

interface LayerBaseOptions { visible?: boolean; opacity?: number; minZoom?: number; maxZoom?: number; zIndex?: number; }

/** r150+ 已移除 build/three.min.js，这里固定用最后一个带 UMD 全局的版本 */
const THREE_CDN = 'https://unpkg.com/three@0.137.5/build/three.min.js';

type ThreeAny = any;
type ThreeStatus = 'idle' | 'loading' | 'ready' | 'error';

let threePromise: Promise<void> | null = null;

/** 按需注入 three.js UMD 包，重复调用复用同一个 promise */
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

const CODE = `// three.js 需要宿主工程自己引入，且必须挂到 window.THREE 上
// 世界坐标单位约等于米，zoom 11 下 500 米的盒子只有几个像素，官方 demo 用的是 15
const layerRef = ref&lt;ThreeLayerRef&gt;();

<Map :default-center="center" :default-zoom="16">
  <ThreeLayer
    ref="layerRef"
    :z-index="5"
    antialias
    :on-init="(renderer, scene, camera, layer) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(500, 500, 500),
        new THREE.MeshBasicMaterial({ color: 0x1890ff }),
      );
      // 句柄的 toWorld 内部走 map.toFormatCoords（实例上的 convertLngLat 在 v4 里是坏的）
      const [x, y] = layer.toWorld(center);
      mesh.position.set(x, y, 250);
      layer.add(mesh);
      layer.triggerRepaint();  // 不调这一下 animate() 会直接 return，画面不更新
    }"
  />
</Map>`;
const caps = useCapabilities();
const driver = useDriver();
const supported = computed(() => caps.value.has('ThreeLayer'));
const presence = computed<'present' | 'missing' | 'unknown'>(() => {
  const d = driver.value;
  if (!d) return 'unknown';
  const raw = d.rawSDK as Record<string, unknown> | null | undefined;
  if (!raw) return 'unknown';
  return typeof raw['ThreeLayer'] === 'function' ? 'present' : 'missing';
});
const PRESENCE_TEXT: Record<'present' | 'missing' | 'unknown', string> = {
  present: 'SDK 类存在', missing: 'SDK 类缺失', unknown: 'SDK 未就绪',
};

const mounted = ref(true);
const base = reactive<LayerBaseOptions>({ visible: true });
const alpha = ref(false);
const antialias = ref(true);
const threeStatus = ref<ThreeStatus>((window as ThreeAny).THREE ? 'ready' : 'idle');
const threeError = ref('');
const cubeOn = ref(true);
const cubeSize = ref(500);
const logs = ref<string[]>([]);

const layerRef = ref<ThreeLayerRef | null>(null);
// 当前挂进场景的 mesh（图层销毁时 SDK 会 dispose 场景内容，所以每次都造新的）
let currentMesh: ThreeAny = null;

// 图层级 opacity 对 ThreeLayer 是死参数：这里把滑块的值落到 mesh 材质上（对齐 react）
const materialOpacity = computed(() => base.opacity ?? 1);

const log = (msg: string) => { logs.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...logs.value].slice(0, 20); };

const requestThree = () => {
  threeStatus.value = 'loading';
  threeError.value = '';
  loadThree().then(
    () => { threeStatus.value = 'ready'; },
    (err: Error) => { threeStatus.value = 'error'; threeError.value = err.message; },
  );
};

onMounted(() => { if (threeStatus.value === 'idle') requestThree(); });

/** 造一个新 mesh 挂进场景。回调内现读最新 cubeSize / materialOpacity（Vue 响应式）。 */
const addCube = (layer: ThreeLayerRef, size: number) => {
  const THREE = (window as ThreeAny).THREE;
  if (!THREE) return;
  const world = layer.toWorld(BEIJING);
  if (!world) { log('addCube 跳过：toWorld 拿不到世界坐标'); return; }
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({
      color: 0x1890ff,
      transparent: materialOpacity.value < 1,
      opacity: materialOpacity.value,
    }),
  );
  const [x, y] = world;
  mesh.position.set(x, y, size / 2);
  currentMesh = mesh;
  layer.add(mesh);
  // add 只 doOnceDraw 一次，animate() 在 needsUpdate 为假时直接 return，补一次 triggerRepaint
  layer.triggerRepaint();
  log(`立方体已添加：边长 ${size}，透明度 ${materialOpacity.value}，世界坐标 (${x.toFixed(1)}, ${y.toFixed(1)})`);
};

const removeCube = (layer: ThreeLayerRef) => {
  if (!currentMesh) return;
  layer.remove(currentMesh);
  currentMesh = null;
  layer.triggerRepaint();
};

// 立方体开关 / 尺寸都不走图层重建：走 ref 句柄的 add / remove 直接改场景。
const toggleCube = (next: boolean) => {
  cubeOn.value = next;
  const layer = layerRef.value;
  if (!layer) return;
  if (next) addCube(layer, cubeSize.value);
  else removeCube(layer);
};

const changeCubeSize = (size: number) => {
  cubeSize.value = size;
  const layer = layerRef.value;
  if (!layer || !cubeOn.value) return;
  removeCube(layer);
  addCube(layer, size);
};

// opacity 不触发图层重建（对 ThreeLayer 本身无效），把值落到当前 mesh 材质上并重绘。
watch(materialOpacity, (v) => {
  const layer = layerRef.value;
  if (!layer || !currentMesh?.material) return;
  currentMesh.material.transparent = v < 1;
  currentMesh.material.opacity = v;
  currentMesh.material.needsUpdate = true;
  layer.triggerRepaint();
});

// 生命周期回调（第 4 参 layer 是组件对外的命令式句柄）
const onInit = (renderer: ThreeAny, scene: ThreeAny, camera: ThreeAny, layer: ThreeLayerRef) => {
  log(`onInit: renderer=${!!renderer} scene=${!!scene} camera=${!!camera}`);
  if (cubeOn.value) addCube(layer, cubeSize.value);
};
const onDestroy = () => { log('onDestroy'); currentMesh = null; };
const onHide = () => { log('onHide'); };
const onShow = () => { log('onShow'); };

// opacity 故意不往下传：组件已把它标成 @deprecated，本页把值接到了立方体材质上（materialOpacity）。
const layerProps = computed(() => {
  const { opacity: _ignoredOpacity, ...baseWithoutOpacity } = base;
  return {
    ...baseWithoutOpacity,
    alpha: alpha.value,
    antialias: antialias.value,
    onInit, onDestroy, onHide, onShow,
  };
});

const callInstance = (name: 'triggerRepaint' | 'triggerStop' | 'refreshMap') => {
  const layer = layerRef.value;
  if (!layer?.raw) { log(`${name}: 实例不可用（图层未创建）`); return; }
  layer[name]();
  log(`${name}() 已调用`);
};

const pickCenter = () => {
  const layer = layerRef.value;
  if (!layer?.raw) { log('pick: 实例不可用'); return; }
  const map = (layer.raw as ThreeAny).getMap();
  const width = map?.width ?? map?.getContainer?.()?.offsetWidth ?? 0;
  const height = map?.height ?? map?.getContainer?.()?.offsetHeight ?? 0;
  const hit = layer.pick(width / 2, height / 2);
  log(`pick(${Math.round(width / 2)}, ${Math.round(height / 2)}) → ${hit ? `${hit.length} 个对象` : 'null'}`);
};

const THREE_TAG: Record<ThreeStatus, string> = {
  idle: 'three.js 未加载',
  loading: 'three.js 加载中',
  ready: 'three.js 已就绪',
  error: 'three.js 加载失败',
};

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

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
const propsText = computed(() => safeJsonStringify(layerProps.value, 2));
</script>
<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="16" style="height:100%">
        <ThreeLayer v-if="supported && mounted && threeStatus === 'ready'" ref="layerRef" v-bind="layerProps" />
      </Map>
    </div>
    <div class="test-controls">
      <h2>ThreeLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <span :class="`cap-tag ${presence === 'present' ? 'ok' : 'no'}`">{{ PRESENCE_TEXT[presence] }}</span>
        <p class="muted small">@since 4.0。SDK 构造函数里 window.THREE 缺失会直接 throw，异常被工厂吞掉后图层静默变成 null —— 所以上面的「SDK 类存在」标签在这一页不代表能用，要看下面的 three.js 状态。</p>
        <p class="muted small">
          左边是能力矩阵（按版本硬编码）的结论，右边是运行时在 SDK 上探测 <code>ThreeLayer</code> 构造函数的结果。
          两者不一致说明能力矩阵与实际 SDK 有偏差，此时图层会被静默跳过。
        </p>
      </section>

      <section>
        <h3>挂载</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="mounted" />挂载图层（勾掉验证 removeLayer 是否干净卸载）</label>
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
          未就绪时本页不渲染 ThreeLayer，避免看到「构造失败 → 静默无图层」的假象。
        </p>
      </section>

      <section>
        <h3>构造参数</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="alpha" />alpha（WebGLRenderer）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="antialias" />antialias（WebGLRenderer）</label>
        <p class="muted small">
          不传 referCenter：v4 的 ThreeLayer.render 取的是 _updatePolyLayerMatrix()（不带 center），
          世界坐标只能相对默认墨卡托基准点，传了 referCenter 反而对不上。
          改这两个开关会重建图层，日志里能看到 onDestroy → onInit。
        </p>
      </section>

      <section>
        <h3>场景内容</h3>
        <label class="checkbox-row"><input type="checkbox" :checked="cubeOn" @change="toggleCube(($event.target as HTMLInputElement).checked)" />在地图中心放一个立方体</label>
        <label class="checkbox-row" style="justify-content:space-between">边长：{{ cubeSize }}
          <input type="range" min="100" max="5000" step="100" :value="cubeSize" @input="changeCubeSize(+($event.target as HTMLInputElement).value)" />
        </label>
        <p class="muted small">
          走 ref 句柄的 layer.add / layer.remove 直接改场景：回调存在组件内部的 ref 里，
          不进 ctorKey，开关和边长的变化不会触发重建。
          边长单位约等于米（世界坐标来自 map.toFormatCoords 的墨卡托偏移），默认 500 与官方 demo 一致；
          屏幕尺寸随缩放级别线性变化，本页默认 zoom 16，缩到 11 附近盒子只剩几个像素；
          俯视角下看到的是立方体顶面，把地图倾斜（setTilt）才能看出体积。
          另外「公共参数」里的 opacity 在 SDK 层面对 ThreeLayer 无效，本页把它接到了立方体材质上
          （当前 {{ materialOpacity }}），详见下面的「已知限制」。
        </p>
      </section>

      <section>
        <h3>实例方法</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="callInstance('triggerRepaint')">triggerRepaint</button>
          <button @click="callInstance('triggerStop')">triggerStop</button>
          <button @click="callInstance('refreshMap')">refreshMap</button>
          <button @click="pickCenter">pick（容器中心）</button>
        </div>
        <p class="muted small">
          这里的方法都来自组件 ref 暴露的句柄（<code>ref&lt;ThreeLayerRef&gt;</code>）。ThreeLayer 只在
          needsUpdate 为真时持续 raf 重绘，triggerStop 之后要靠 triggerRepaint / refreshMap 才会再画。
          pick 用的是 SDK 内部的 THREE.Raycaster，命中场景里的立方体才会返回非空数组。
        </p>
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
        <p class="muted small">图层无 setter，改动通过 layerKey 触发重建；页面未使用手写 key。</p>
      </section>

      <section>
        <h3>当前 Props</h3>
        <pre class="props-view">{{ propsText }}</pre>
      </section>

      <section>
        <h3>回调日志</h3>
        <p v-if="logs.length === 0" class="muted small">触发控件回调后显示日志</p>
        <pre v-else class="props-view">{{ logs.join('\n') }}</pre>
      </section>

      <section>
        <h3>已知限制</h3>
        <p class="muted small">
          onRender 会整体替换默认的 renderer.render(scene, camera)，接上就必须自己渲染，
          所以本页只接 onInit / onDestroy / onHide / onShow。
          实例上的 convertLngLat 在 v4 里是坏的（内部把 map.toFormatCoords 这个函数当带 setCenter 的对象用），
          组件的 layer.toWorld 绕开了它，直接走 map.toFormatCoords。
          referCenter 对 ThreeLayer 也是死参数：SDK 的 setRefCenter 只改 this.center 并调 parseData，
          而 ThreeLayer 既没有 parseData，render 取的也是不带 center 的 _updatePolyLayerMatrix()。
          还有 opacity：NormalLayer 的构造函数会存 this.opacity、也提供 setOpacity/getOpacity，
          但 ThreeLayer 的 render 只做 renderer.render(scene, camera)，整块原型里从不读它 ——
          真正消费它的是 LineLayer / FillLayer 这类自己写 shader、把它当 u_opacity uniform 的图层。
          组件已把它标成 @deprecated 并在开发环境提醒一次；three.js 场景的透明度只能设在材质
          （transparent + opacity）或 renderer 上，所以本页把滑块的值转发给了立方体的 material。
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
