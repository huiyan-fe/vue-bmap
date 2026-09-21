/**
 * BMapProvider —— 加载 JSAPI、创建 driver，并通过 provide 下发。
 * 对应 react-bmap 的 provider/BMapProvider.tsx。
 *
 * 设计要点：
 * - loadKey 含 version/ak/serviceHost/language/plugins，由 loader 去重缓存。
 * - generation token 防超时后到达的脚本覆盖。
 * - 状态用 shallowRef（driver 内含 SDK 实例，不能深代理）。
 * - 加载中渲染 fallback 插槽，失败渲染 error 插槽。
 */
import { defineComponent, h, onBeforeUnmount, onMounted, provide, shallowRef, type PropType } from 'vue';
import type { BMapVersion, LoadKeyComponents, UnsupportedBehavior } from '../types';
import { BMAP_KEY, type BMapContextValue } from '../context';
import { createDriver } from '../drivers/createDriver';
import { loadJSAPI } from '../loader';

export const BMapProvider = defineComponent({
  name: 'BMapProvider',
  props: {
    ak: { type: String, required: true },
    version: { type: String as PropType<BMapVersion>, default: '4.0' },
    protocol: { type: String as PropType<'http' | 'https'>, default: undefined },
    serviceHost: { type: String, default: undefined },
    language: { type: String, default: undefined },
    plugins: { type: Array as PropType<string[]>, default: undefined },
    timeout: { type: Number, default: undefined },
    globalConfig: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    unsupportedBehavior: { type: String as PropType<UnsupportedBehavior>, default: 'warn' },
    onError: { type: Function as PropType<(err: Error) => void>, default: undefined },
    onLoadConflict: {
      type: Function as PropType<(current: LoadKeyComponents, requested: LoadKeyComponents) => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const state = shallowRef<BMapContextValue>({
      status: 'loading',
      driver: null,
      version: props.version,
      error: null,
    });
    provide(BMAP_KEY, state);

    let generation = 0;
    let cancelled = false;

    onMounted(() => {
      if (typeof window === 'undefined') return; // SSR
      const my = ++generation;
      const components: LoadKeyComponents = {
        version: props.version,
        ak: props.ak,
        serviceHost: props.serviceHost,
        language: props.language,
        plugins: props.plugins,
      };
      loadJSAPI(components, {
        protocol: props.protocol,
        timeout: props.timeout,
        globalConfig: props.globalConfig,
        onLoadConflict: (current, requested) => props.onLoadConflict?.(current, requested),
      })
        .then(({ rawSDK, version: real }) => {
          if (cancelled || my !== generation) return;
          const driver = createDriver(real, rawSDK, { unsupportedBehavior: props.unsupportedBehavior });
          state.value = { status: 'ready', driver, version: real, error: null };
        })
        .catch((err: unknown) => {
          if (cancelled || my !== generation) return;
          const error = err instanceof Error ? err : new Error(String(err));
          state.value = { ...state.value, status: 'error', error };
          if (props.onError) props.onError(error);
          else if (typeof console !== 'undefined') {
            console.error(
              '[vue-bmap] 地图脚本加载失败，<BMapProvider> 的子树不会渲染。' +
                '请检查 ak 是否有效、是否配置了域名白名单、网络能否访问百度地图服务。',
              error,
            );
          }
        });
    });

    onBeforeUnmount(() => {
      cancelled = true;
      generation++;
    });

    return () => {
      const s = state.value;
      if (s.status === 'loading') return slots.fallback ? slots.fallback() : null;
      if (s.status === 'error') return slots.error ? slots.error({ error: s.error }) : null;
      return slots.default ? slots.default() : null;
    };
  },
});

export type BMapProviderProps = InstanceType<typeof BMapProvider>['$props'];
