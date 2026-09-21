# Vue-BMap 设计方案

> 用 Vue 3 组件写百度地图，对标 [`@baidumap/react-bmap`](../react-bmap)，实现同等功能。
> 一套代码同时支持百度地图 JSAPI **3.0（2D）** 与 **4.0（WebGL）**。

## 0. 目标与范围

- **目标**：提供与 react-bmap 对等的声明式地图组件库 —— 地图、覆盖物、控件、图层、右键菜单、全景都是普通 Vue 组件；检索类能力以 composable 提供。
- **框架**：**仅支持 Vue 3（>=3.3）**。明确**不兼容 Vue 2**（Vue 2 已 EOL；其 `provide/inject` 非响应式、渲染函数签名不同、无 `defineExpose`，兼容成本高、收益低）。若未来确有需求，再基于 `vue-demi` 扩展，届时框架无关层无需改动，切换成本可控。
- **非目标**：不改动百度 SDK 原型、不做坐标纠偏、不内置 three.js。

## 1. 核心结论

react-bmap 有清晰的分层：**框架无关核心层**（loader / drivers / types / const / constants / 大部分 utils）**零 React 依赖**，可原样复制；只有**绑定层**（context / provider / 组件工厂 / components / hooks）依赖 React，需用 Vue 3 Composition API 重写。

因此本移植是"**换绑定层**"而非重写整库：框架无关层约占代码量 40–50%，直接复用；风险集中在绑定层的两块 —— **组件工厂**与 **Map 组件**。

## 2. 架构分层

```
JSAPI（百度地图 3.0 / 4.0 原生 SDK）
   ↑
loader/        加载脚本、按 loadKey 去重              ← 复用
drivers/       抽象 v3/v4 差异，统一 BMapDriver 接口   ← 复用
types/ const/ constants/   类型与常量                ← 复用
utils/         stableStringify / pointEquals 等       ← 复用（去 useLatest）
   ↑ ───────────────────── 绑定层（重写）─────────────────────
context/       provide/inject keys                    ← React Context 改写
provider/      加载 + 建 driver + provide             ← Vue 组件
utils/createComponent   overlay/control/layer 生命周期  ← 核心难点
components/    Map / Overlay / Control / Layer / Menu / Panorama
composables/   useMap / useMapEvent / 15 个检索 hook
```

## 3. 可直接复用的部分（约占 40–50%）

以下目录从 react-bmap **原样复制**，无需改动（纯 TS，接口全部围绕 `BMapDriver` 与 handle）：

- `src/loader/` —— `loadJSAPI`、`registry`、`stableHash`
- `src/drivers/` —— `v3Driver`、`v4Driver`、`createDriver`、`capabilityMatrix`、`unsupported`、`types.ts`（440 行的 `BMapDriver` 接口，覆盖全部 SDK 能力，是全库基石）
- `src/types/`、`src/const/`、`src/constants/`
- `src/utils/` 中除 `useLatest.ts`（React-only，Vue 不需要）外的全部：`stableStringify`、`pointEquals`、`shallowEqual`、`event`、`handle`、`sdk`、`debugWarn`
- 测试的 `fakeDriver.ts` / `fakeSDK.ts`

这一层不动，是本方案低成本落地的前提。

## 4. React → Vue 3 绑定层映射

| React | Vue 3 |
| --- | --- |
| `createContext` / `useContext` | `provide` / `inject` + `InjectionKey` |
| `BMapProvider` 组件 | `defineComponent`，`shallowRef` 持有状态并 `provide` |
| `useState` | `ref` / `reactive` |
| `useEffect(fn, deps)` | `watch(deps, fn)` / `watchEffect` |
| `useLayoutEffect` | `onMounted` + `watch(..., { flush: 'post' })` |
| `useRef`（存 SDK 实例） | **普通变量 / `shallowRef`**（严禁进 `reactive`） |
| `useMemo` | `computed` |
| `forwardRef` + `MapRef` | `defineExpose` |
| `props.children` + Context.Provider | `<slot>` + `provide` |
| StrictMode 双挂载 | Vue 无此问题，相关 `reuseHandle`/`deferMount` 逻辑可删 |

## 5. 核心机制的 Vue 实现

### 5.1 Provider（`src/provider/BMapProvider.ts`）

```ts
export const BMAP_KEY: InjectionKey<Readonly<Ref<BMapContextValue>>> = Symbol('bmap')

export default defineComponent({
  props: { ak: String, version: { type: String, default: '4.0' }, /* … */ },
  setup(props, { slots }) {
    const state = shallowRef<BMapContextValue>({ status: 'loading', driver: null, version: props.version, error: null })
    provide(BMAP_KEY, state)
    onMounted(() => {
      loadJSAPI({ ...props }, { /* protocol/timeout/globalConfig */ })   // ← 复用无关层
        .then(({ rawSDK, version }) => {
          state.value = { status: 'ready', driver: createDriver(version, rawSDK, { unsupportedBehavior: props.unsupportedBehavior }), version, error: null }
        })
        .catch(err => { state.value = { ...state.value, status: 'error', error: err }; props.onError?.(err) })
    })
    return () => state.value.status === 'ready' ? slots.default?.()
      : state.value.status === 'error' ? slots.error?.() : slots.fallback?.()
  }
})
```

要点：状态用 `shallowRef`（driver 内含 SDK，不能深代理）；`provide` 的是响应式 ref，子组件 `inject` 后 `watch` 到 ready 才挂载。

### 5.2 组件工厂（`src/utils/createComponent.ts`）—— 最核心

保留 react-bmap 的三工厂设计（`createOverlayComponent` / `createControlComponent` / `createLayerComponent`），把每个组件压成 5 行配置。Vue 版返回 `defineComponent`：

```ts
export function createOverlayComponent<P>(config: OverlayComponentConfig<P>) {
  return defineComponent({
    name: config.displayName,
    props: /* 由 config 声明推导 */,
    setup(props, { slots }) {
      const ctx = inject(BMAP_MAP_KEY)!            // { map, driver }
      const target = inject(OVERLAY_TARGET_KEY, null)
      let handle: OverlayHandle | null = null      // 非响应式：SDK 实例
      const store = shallowRef<OverlayHandle | null>(null)  // 供子组件订阅

      const create = () => { /* factory → add，对应 useLayoutEffect 创建块 */ }
      const destroy = () => { /* remove，对应 cleanup */ }
      const recreate = () => { destroy(); create() }

      onMounted(create)
      onUnmounted(destroy)

      // 各属性独立 watch（对应各 useEffect）
      if (config.positionProp) watch(() => stableStringify(props[config.positionProp]), () => handle && ctx.driver.setOverlayPosition(handle, props[config.positionProp]))
      if (config.pathProp)     watch(() => stableStringify(props[config.pathProp]),     () => handle && ctx.driver.setOverlayPath(handle, props[config.pathProp]))
      if (config.optionProps)  watch(() => stableStringify(optSnapshot()), applyOptions)
      if (config.ctorOnlyProps) watch(() => stableStringify(ctorSnapshot()), recreate)  // 无 setter → 重建
      // visible / events 同理

      if (config.supportsChildren) { provide(OVERLAY_TARGET_KEY, { type: config.childTargetType, handle: store }); return () => slots.default?.() }
      return () => null
    }
  })
}
```

关键差异（相比 React 版更简单）：
- **父子时序**（Marker→Label）：React 用 `useSyncExternalStore` + listener；Vue 直接 `provide` 一个 `shallowRef<handle>`，子组件 `watch` 它即可。
- **无 StrictMode**：删掉 `reuseHandle` / `deferMount` / `instanceVersion` 等一系列补丁。
- **各组件配置文件**（`Overlay/index.ts`、`Control/index.ts`、`Layer/index.ts`）几乎原样复制 —— 它们只声明 `factory`/`optionProps`/`events`，与框架无关。
- **陷阱**：`handle`、`store.value` 存的 SDK 实例必须用 `shallowRef` 或普通变量，绝不能进 `reactive`/`ref` 深代理。

### 5.3 Map 组件（`src/components/Map/`）

对标 `Map.tsx`（563 行），绑定层第二大块：
- `<div ref="container">`，`onMounted` 调 `driver.createMap`；等 `tilesloaded`（GL 首帧）再 `provide` map，时序照搬。
- 受控 props（center/zoom/heading/tilt）→ 每个一个 `watch` + `internalUpdate` 抑制回环 + `pointEquals`，逻辑照搬。
- 交互开关、样式、光标、主题、事件订阅：照搬。
- 命令式句柄：`MapRefImpl`（框架无关，复用）通过 `defineExpose` 暴露 `panTo`/`flyTo`/`setZoom`/`getBounds`/`pointToPixel`/`getScreenshot` 等。
- GL error 抑制器照搬。

### 5.4 Composables（`src/composables/`）

15 个检索 hook（`useDrivingRoute` 等）+ `useMap`/`useMapEvent`/`useMapStatus`/`useSymbol`/`useIcon`/`useRawOverlay`/`useRawControl`：
- `useState`→`ref`，`useCallback`→普通函数，`useEffect`→`watch`，cleanup→`onScopeDispose`。
- 返回 `{ data, loading, error, search, ... }`，其中 data/loading/error 为 `ref`（Vue 惯例）。
- `renderHelpers.ts`、`useServiceTimeout` 逻辑基本框架无关，可照搬。

## 6. 目录结构

与 react-bmap 对齐，便于对照维护：

```
vue-bmap/
├── src/
│   ├── loader/ drivers/ types/ const/ constants/   ← 复制
│   ├── utils/                                        ← 复制（去 useLatest）
│   ├── context/          （provide/inject keys）      ← 重写
│   ├── provider/BMapProvider.ts                      ← 重写
│   ├── utils/createComponent.ts                      ← 重写
│   ├── components/  Map / Overlay / Control / Layer / Menu / Panorama  ← 重写
│   ├── composables/      （原 hooks）                 ← 重写
│   └── index.ts                                       ← 对齐导出清单
├── examples/          （Vue 3 + vue-router 示例站）
├── package.json  vite.config.ts  vitest.config.ts
```

## 7. 依赖与构建

- `package.json`：`name` 改 `@baidumap/vue-bmap`；`peerDependencies` 由 react 换成 `"vue": ">=3.3.0"`；保留 `@baidumap/jsapi-loader` 依赖。
- `vite.config.ts`：`@vitejs/plugin-react` → `@vitejs/plugin-vue`（+ 需要 JSX 时加 `@vitejs/plugin-vue-jsx`）；`build.rollupOptions.external` 由 `react*` 换成 `['vue']`；保留 `vite-plugin-dts`。
- 测试：`@testing-library/react` → `@testing-library/vue` + `@vue/test-utils`；vitest + jsdom 保留。

## 8. API 风格决策（推荐默认值）

以下两点影响所有组件签名，采用推荐默认，可后续调整：

- **组件写法**：`defineComponent` + 渲染函数（与工厂配置模式最契合，不用 SFC）。
- **事件风格**：优先 Vue 惯用的 `emit`（`@click` / `@dragend`），组件内把 SDK 事件 `emit` 出去；`Map` 的回调仍可保留 `on*` prop 以贴近 react-bmap 文档。最终以 `emit` 为主。

## 9. 分阶段实施计划与发布节奏

**总原则**：核心先行，主要功能先落地成可用版本，长尾按需增量补齐——**终态对齐 react-bmap 的 `index.ts` 全量导出**，但不一次全铺。

原因：工厂 + 配置驱动让"复刻的量"很便宜，但"验证成本"随组件数线性叠加（每个组件都要在 v3/v4、受控/事件/重建各路径测一遍）。长尾件使用率低、验证却重，过早投入产出比差。故先用最小闭环验证核心架构，再一口气做到"能做真实项目"，最后增量补长尾。

- **P0 地基**：复制 loader/drivers/types/const/constants/utils；搭 build/test 骨架；跑通 driver 单测（框架无关，直接验证地基）。
- **P1 最小闭环**：`BMapProvider` + `Map`（含受控 + 事件 + ref 句柄）+ `Marker` + `createComponent` 工厂 → 能显示地图并打点，验证核心机制。**架构一旦跑通，后续基本是复制配置。**
- **P2 主要功能** ⭐ **← 首个可用版本（alpha）的边界**：填齐高频组件，覆盖约 80% 真实场景，可发 alpha 拿反馈：
  - 覆盖物：`Marker`、`Label`、`Polyline`、`Polygon`、`Circle`、`Rectangle`、`InfoWindow`、`CustomOverlay`
  - 控件：`NavigationControl`、`ScaleControl`、`ZoomControl`、`MapTypeControl`、`GeolocationControl`
  - 图层：`TrafficLayer`、`TileLayer`
  - 检索：`useLocalSearch`、`useGeocoder`、`useDrivingRoute`、`useWalkingRoute`、`useTransitRoute`
- **P3 补齐检索 composables**：其余 service hook（`useRidingRoute`、`useBusLineSearch`、`useAutocomplete`、`useBoundary`、`useLocalCity`、`useConvertor`、`useGeolocation`、`usePlaceDetail`、`usePanoramaService`、`useTruckRoute`）。
- **P4 补齐长尾组件**：剩余覆盖物/控件/图层（`BezierCurve`、`Prism`、`Marker3D`、`GroundOverlay`、`PointCollection`、异形 Layer 等）、Panorama、Menu、ThreeLayer、RawOverlay/RawControl、错误处理（`onErrorCaptured`）。
- **P5 收尾（终态对齐）**：示例站 + README + 对齐 `index.ts` 全量导出，发正式版。

**发布节奏**：P2 完成即出 **alpha**（可用）；P3 完成出 **beta**（检索完整）；P5 完成出 **1.0**（与 react-bmap 全量对齐）。

## 10. 主要风险

1. **响应式陷阱（最高）**：SDK 实例、handle、driver 绝不能进 Vue 深度响应式（`reactive` / `ref` 深代理），必须用 `shallowRef` 或普通变量，否则 Vue 的 Proxy 会破坏 SDK 内部对象。
2. **effect 时序**：Vue `watch` 的 flush 时机（pre/post/sync）与 React effect 不同，Map 首帧、受控回环抑制等处需逐个校准。
3. **复杂度集中**：组件工厂 + Map 两块占绑定层绝大部分复杂度，其余是走量复制配置。
