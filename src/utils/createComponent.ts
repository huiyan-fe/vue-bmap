/**
 * 通用组件工厂 —— 消除 Overlay / Control / Layer 组件的重复代码。
 * 对应 react-bmap 的 utils/createComponent.tsx，改用 Vue 3 Composition API 实现。
 *
 * 每个具体组件只需声明：工厂方法、position/path prop、options prop、ctorOnly prop、events。
 * 工厂内部统一处理：mounted→create→add、unmounted→remove、prop change→setter。
 *
 * 事件：以 Vue 惯用的 on* 回调 prop 暴露（`@click` 会编译成 onClick 传入），
 * 回调签名与 react-bmap 保持一致：(point, raw)。
 */
import {
  computed, defineComponent, inject, onUnmounted, provide,
  shallowRef, watch, type PropType,
} from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY, type OverlayTargetStore, type OverlayTargetType } from '../context';
import { stableStringify } from './stableStringify';
import { devWarn } from './debugWarn';
import type { BMapDriver } from '../drivers/types';
import type { ControlHandle, LayerHandle, OverlayHandle, Point } from '../types';

// ─────────────── 配置类型（与 react-bmap 对齐，便于直接复制各组件配置） ───────────────

export interface OverlayComponentConfig<P> {
  factory: (driver: BMapDriver, props: P) => OverlayHandle | null;
  positionProp?: keyof P & string;
  pathProp?: keyof P & string;
  optionProps?: Array<keyof P & string>;
  ctorOnlyProps?: Array<keyof P & string>;
  supportsChildren?: boolean;
  childTargetType?: OverlayTargetType;
  attachToMarkerAsLabel?: boolean;
  events?: Array<{ sdk: string; prop: keyof P & string }>;
  displayName?: string;
  skipMount?: boolean;
}

export interface ControlComponentConfig<P> {
  factory: (driver: BMapDriver, props: P) => ControlHandle | null;
  optionProps?: Array<keyof P & string>;
  ctorOnlyProps?: Array<keyof P & string>;
  events?: Array<{ sdk: string; prop: keyof P & string }>;
  displayName?: string;
}

export interface LayerComponentConfig<P> {
  factory: (driver: BMapDriver, props: P) => LayerHandle | null;
  addMethod?: keyof BMapDriver;
  removeMethod?: keyof BMapDriver;
  events?: ReadonlyArray<{ sdk: string; prop: keyof P & string }>;
  displayName?: string;
}

// ─────────────── 工具 ───────────────

/** 由配置推导 Vue props 声明：几何/选项/ctor prop 接受任意值，event prop 为 Function。 */
function buildProps(
  keys: string[],
  events: Array<{ sdk: string; prop: string }> = [],
  extra: string[] = [],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const k of [...keys, ...extra]) props[k] = { default: undefined };
  for (const e of events) props[e.prop] = { type: Function as PropType<(...a: unknown[]) => void>, default: undefined };
  return props;
}

// ─────────────── Overlay 组件工厂 ───────────────

export function createOverlayComponent<P extends Record<string, any>>(config: OverlayComponentConfig<P>) {
  const factoryKeys = [
    ...(config.positionProp ? [config.positionProp] : []),
    ...(config.pathProp ? [config.pathProp] : []),
    ...(config.optionProps ?? []),
    ...(config.ctorOnlyProps ?? []),
  ] as string[];

  return defineComponent({
    name: config.displayName || 'OverlayComponent',
    props: buildProps(factoryKeys, config.events as any, ['visible']) as any,
    setup(props: any, { slots }) {
      const mapCtx = inject(MAP_KEY, null);
      const target = inject(OVERLAY_TARGET_KEY, null);
      if (!mapCtx) throw new Error(`[vue-bmap] <${config.displayName}> 必须用在 <Map> 内部`);

      let handle: OverlayHandle | null = null;
      const store = shallowRef<OverlayHandle | null>(null);
      let unsubs: Array<() => void> = [];
      let optionBaseline: Record<string, unknown> = {};
      let appliedOptKeys: string[] = [];

      const collectFactoryProps = (): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        for (const k of factoryKeys) {
          const v = props[k];
          if (v !== undefined && v !== null) out[k] = v;
        }
        return out;
      };

      const bindEvents = () => {
        const ctx = mapCtx.value;
        if (!handle || !ctx || !config.events) return;
        for (const { sdk, prop } of config.events) {
          unsubs.push(ctx.driver.addEventListener(handle, sdk, (raw: any) => {
            const fn = props[prop];
            if (typeof fn === 'function') fn(raw?.point ?? raw?.latlng ?? raw?.latLng ?? raw, raw);
          }));
        }
      };
      const unbindEvents = () => { unsubs.forEach((u) => u()); unsubs = []; };

      const create = () => {
        const ctx = mapCtx.value;
        if (!ctx || !ctx.map) return;
        const { map, driver } = ctx;
        const factoryProps = collectFactoryProps();
        const h = config.factory(driver, factoryProps as P);
        if (!h) return;
        handle = h;
        store.value = h;

        const attachMarker = !!config.attachToMarkerAsLabel && target?.type === 'marker';
        if (!config.skipMount) {
          if ((h as any).type === 'hotspot') {
            driver.addHotspot?.(map, h);
          } else if (attachMarker) {
            const mk = target!.handle.value as OverlayHandle | null;
            if (mk) driver.setMarkerLabel(mk, h);
          } else if (target?.addOverlay) {
            target.addOverlay(h);
          } else {
            driver.addOverlay(map, h);
          }
        }

        // 初始 options + baseline 快照（供 prop 变回 undefined 时还原）
        if (config.optionProps) {
          const defaultableKeys = config.optionProps.filter((k) => factoryProps[k as string] === undefined);
          optionBaseline = defaultableKeys.length > 0
            ? driver.snapshotOverlayOptions(h, defaultableKeys as string[])
            : {};
          const initOpts: Record<string, unknown> = {};
          for (const k of config.optionProps) {
            const v = factoryProps[k as string];
            if (v !== undefined && v !== null) initOpts[k as string] = v;
          }
          appliedOptKeys = Object.keys(initOpts);
          if (appliedOptKeys.length > 0) driver.setOverlayOptions(h, initOpts);
        }
        if (props.visible === false) driver.hideOverlay(h);
        bindEvents();
      };

      const destroy = () => {
        if (!handle) return;
        const ctx = mapCtx.value;
        unbindEvents();
        if (!config.skipMount && ctx?.map) {
          const attachMarker = !!config.attachToMarkerAsLabel && target?.type === 'marker';
          try {
            if ((handle as any).type === 'hotspot') ctx.driver.removeHotspot?.(ctx.map, handle);
            else if (attachMarker) {
              const mk = target!.handle.value as OverlayHandle | null;
              if (mk) ctx.driver.removeMarkerLabel(mk, handle);
            } else if (target?.removeOverlay) target.removeOverlay(handle);
            else ctx.driver.removeOverlay(ctx.map, handle);
          } catch { /* ignore */ }
        }
        handle = null;
        store.value = null;
      };

      const recreate = () => { destroy(); create(); };

      // 就绪判定：map 可用；作为 Marker 子 Label 时还需等 marker handle 就绪
      const ready = computed(() => {
        const map = mapCtx.value?.map;
        if (!map) return false;
        if (config.attachToMarkerAsLabel && target?.type === 'marker') return !!target.handle.value;
        return true;
      });
      watch(ready, (r) => {
        if (r && !handle) create();
        else if (!r && handle) destroy();
      }, { immediate: true });

      // position 更新
      if (config.positionProp) {
        const key = config.positionProp as string;
        watch(() => stableStringify(props[key]), () => {
          const ctx = mapCtx.value;
          if (handle && ctx?.driver && props[key] != null) ctx.driver.setOverlayPosition(handle, props[key] as Point);
        });
      }
      // path 更新
      if (config.pathProp) {
        const key = config.pathProp as string;
        watch(() => stableStringify(props[key]), () => {
          const ctx = mapCtx.value;
          if (handle && ctx?.driver && props[key] != null) ctx.driver.setOverlayPath(handle, props[key] as Point[]);
        });
      }
      // options 更新（含 prop 变回 undefined 时的还原）
      if (config.optionProps) {
        const optKeys = config.optionProps as string[];
        const snapshot = () => optKeys.reduce<Record<string, unknown>>((acc, k) => {
          if (props[k] !== undefined) acc[k] = props[k];
          return acc;
        }, {});
        watch(() => stableStringify(snapshot()), () => {
          const ctx = mapCtx.value;
          if (!handle || !ctx?.driver) return;
          const snap = snapshot();
          const nextKeys = Object.keys(snap);
          const removed = appliedOptKeys.filter((k) => !nextKeys.includes(k));
          if (removed.length > 0) {
            const restorable: Record<string, unknown> = {};
            const unrestorable: string[] = [];
            for (const k of removed) {
              if (k in optionBaseline) restorable[k] = optionBaseline[k];
              else unrestorable.push(k);
            }
            if (Object.keys(restorable).length > 0) unrestorable.push(...ctx.driver.restoreOverlayOptions(handle, restorable));
            if (unrestorable.length > 0) devWarn(`${config.displayName ?? 'Overlay'} 的 ${unrestorable.join(' / ')} 由有值变 undefined，框架拿不到 SDK 默认值可还原`);
          }
          appliedOptKeys = nextKeys;
          if (nextKeys.length > 0) ctx.driver.setOverlayOptions(handle, snap);
        });
      }
      // ctorOnlyProps 变化 → 重建
      if (config.ctorOnlyProps) {
        const ctorKeys = config.ctorOnlyProps as string[];
        watch(() => stableStringify(ctorKeys.map((k) => props[k])), () => { if (handle) recreate(); });
      }
      // 可见性
      watch(() => props.visible, (v) => {
        const ctx = mapCtx.value;
        if (!handle || !ctx?.driver) return;
        if (v === false) ctx.driver.hideOverlay(handle);
        else ctx.driver.showOverlay(handle);
      });

      onUnmounted(destroy);

      if (config.supportsChildren) {
        const childStore: OverlayTargetStore = {
          type: config.childTargetType ?? 'overlay',
          handle: store as any,
        };
        provide(OVERLAY_TARGET_KEY, childStore);
        return () => (slots.default ? slots.default() : null);
      }
      return () => null;
    },
  });
}

// ─────────────── Control 组件工厂 ───────────────

export function createControlComponent<P extends Record<string, any>>(config: ControlComponentConfig<P>) {
  const factoryKeys = [...(config.optionProps ?? []), ...(config.ctorOnlyProps ?? [])] as string[];

  return defineComponent({
    name: config.displayName || 'ControlComponent',
    props: buildProps(factoryKeys, config.events as any, ['visible']) as any,
    setup(props: any, { slots }) {
      const mapCtx = inject(MAP_KEY, null);
      if (!mapCtx) throw new Error(`[vue-bmap] <${config.displayName}> 必须用在 <Map> 内部`);
      let handle: ControlHandle | null = null;
      let unsubs: Array<() => void> = [];

      const collect = (): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        for (const k of factoryKeys) { const v = props[k]; if (v !== undefined && v !== null) out[k] = v; }
        return out;
      };
      const create = () => {
        const ctx = mapCtx.value;
        if (!ctx || !ctx.map) return;
        const h = config.factory(ctx.driver, collect() as P);
        if (!h) return;
        handle = h;
        ctx.driver.addControl(ctx.map, h);
        if (props.visible === false) ctx.driver.hideControl(h);
        if (config.events) {
          for (const { sdk, prop } of config.events) {
            unsubs.push(ctx.driver.addEventListener(h, sdk, (raw: any) => {
              const fn = props[prop];
              if (typeof fn === 'function') fn(raw);
            }));
          }
        }
      };
      const destroy = () => {
        unsubs.forEach((u) => u()); unsubs = [];
        const ctx = mapCtx.value;
        if (handle && ctx?.map) { try { ctx.driver.removeControl(ctx.map, handle); } catch { /* ignore */ } }
        handle = null;
      };
      const recreate = () => { destroy(); create(); };

      watch(() => mapCtx.value?.map, (m) => { if (m && !handle) create(); else if (!m && handle) destroy(); }, { immediate: true });

      if (config.optionProps) {
        const optKeys = config.optionProps as string[];
        // option prop 在 null/有值间切换会重建（SDK 无「取消设置」语义）
        watch(() => stableStringify(optKeys.map((k) => props[k] == null)), () => { if (handle) recreate(); });
        watch(() => stableStringify(optKeys.reduce<Record<string, unknown>>((a, k) => { if (props[k] !== undefined) a[k] = props[k]; return a; }, {})), () => {
          const ctx = mapCtx.value;
          if (!handle || !ctx?.driver) return;
          // 构造函数已设置初始 options；此 watch 非 immediate，只在 prop 真正变化时触发，
          // 因此每次触发都应用（不能像 react 那样跳过首次——Vue 挂载时根本不会触发）。
          const snap = optKeys.reduce<Record<string, unknown>>((a, k) => { if (props[k] !== undefined) a[k] = props[k]; return a; }, {});
          if (Object.keys(snap).length > 0) ctx.driver.setControlOptions(handle, snap);
        });
      }
      if (config.ctorOnlyProps) {
        const ctorKeys = config.ctorOnlyProps as string[];
        watch(() => stableStringify(ctorKeys.map((k) => props[k])), () => { if (handle) recreate(); });
      }
      watch(() => props.visible, (v) => {
        const ctx = mapCtx.value;
        if (!handle || !ctx?.driver) return;
        if (v === false) ctx.driver.hideControl(handle);
        else ctx.driver.showControl(handle);
      });
      onUnmounted(destroy);
      return () => (slots.default ? slots.default() : null);
    },
  });
}

// ─────────────── Layer 组件工厂 ───────────────

export function createLayerComponent<P extends Record<string, any>>(config: LayerComponentConfig<P>) {
  return defineComponent({
    name: config.displayName || 'LayerComponent',
    // 图层没有 setter 抽象：所有 prop 都参与 layerKey，变化即重建。用 inheritAttrs:false + attrs 收集。
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const mapCtx = inject(MAP_KEY, null);
      if (!mapCtx) throw new Error(`[vue-bmap] <${config.displayName}> 必须用在 <Map> 内部`);
      let handle: LayerHandle | null = null;
      let unsubs: Array<() => void> = [];
      const add = (config.addMethod ?? 'addLayer') as string;
      const remove = (config.removeMethod ?? 'removeLayer') as string;

      const collect = (): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(attrs)) {
          if (k.startsWith('on')) continue; // 事件监听交由 events 处理
          if (v !== undefined && v !== null) out[k] = v;
        }
        return out;
      };
      const create = () => {
        const ctx = mapCtx.value;
        if (!ctx || !ctx.map) return;
        const h = config.factory(ctx.driver, collect() as P);
        if (!h) return;
        handle = h;
        (ctx.driver as any)[add](ctx.map, h);
        if (config.events && h.raw) {
          for (const ev of config.events) {
            unsubs.push(ctx.driver.addEventListener(h, ev.sdk, (e: any) => {
              const fn = (attrs as any)[`on${ev.prop.charAt(0).toUpperCase()}${ev.prop.slice(1)}`] ?? (attrs as any)[ev.prop];
              if (typeof fn === 'function') fn(e);
            }));
          }
        }
      };
      const destroy = () => {
        unsubs.forEach((u) => u()); unsubs = [];
        const ctx = mapCtx.value;
        if (handle && ctx?.map) { try { (ctx.driver as any)[remove](ctx.map, handle); } catch { /* ignore */ } }
        handle = null;
      };

      const layerKey = computed(() => stableStringify(collect()));
      watch([() => mapCtx.value?.map, layerKey], () => { destroy(); create(); }, { immediate: true });
      onUnmounted(destroy);
      return () => (slots.default ? slots.default() : null);
    },
  });
}




