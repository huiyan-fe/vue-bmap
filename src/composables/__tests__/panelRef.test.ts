// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, provide, ref, shallowRef, type App } from 'vue';
import { BMAP_KEY, type BMapContextValue } from '../../context';
import { useLocalSearch } from '../useLocalSearch';
import { useDrivingRoute } from '../useDrivingRoute';
import { useWalkingRoute } from '../useWalkingRoute';
import { useRidingRoute } from '../useRidingRoute';
import { useTransitRoute } from '../useTransitRoute';
import { useTruckRoute } from '../useTruckRoute';
import { useBusLineSearch } from '../useBusLineSearch';
import { useAutocomplete } from '../useAutocomplete';

/**
 * panel 支持 Ref<HTMLElement>：挂载带假 driver 的组件，断言 8 个 service hook
 * 传给 driver 的 renderOptions.panel 从「无」变为元素。
 */

interface Call { name: string; args: unknown[]; }

type PanelKey =
  | 'localSearch' | 'driving' | 'walking' | 'riding'
  | 'transit' | 'truck' | 'busLine' | 'autocomplete';

const PANEL_KEYS: PanelKey[] = [
  'localSearch', 'driving', 'walking', 'riding',
  'transit', 'truck', 'busLine', 'autocomplete',
];

// createXxx 方法名 → 对应 panel ref
const METHOD_TO_PANEL: Record<string, PanelKey> = {
  createLocalSearch: 'localSearch',
  createDrivingRoute: 'driving',
  createWalkingRoute: 'walking',
  createRidingRoute: 'riding',
  createTransitRoute: 'transit',
  createTruckRoute: 'truck',
  createBusLineSearch: 'busLine',
  createAutocomplete: 'autocomplete',
};

const calls: Call[] = [];

const panels = Object.fromEntries(
  PANEL_KEYS.map((k) => [k, ref<HTMLElement | null>(null)]),
) as Record<PanelKey, ReturnType<typeof ref<HTMLElement | null>>>;

/** 假 driver：记录每次 createXxx 的入参，返回一个空的 ServiceHandle。 */
function makeFakeDriver() {
  const raw = {
    setSearchCompleteCallback: () => {},
    setMarkersSetCallback: () => {},
    setInfoHtmlSetCallback: () => {},
    setResultsHtmlSetCallback: () => {},
    setPolylinesSetCallback: () => {},
    setGetBusListCompleteCallback: () => {},
    setGetBusLineCompleteCallback: () => {},
  };
  const record = (name: string) => (...args: unknown[]) => {
    calls.push({ name, args });
    return { __brand: 'ServiceHandle', raw, isNull: false };
  };
  return {
    version: '4.0',
    getCenter: () => ({ lng: 116.404, lat: 39.915 }),
    createLocalSearch: record('createLocalSearch'),
    createDrivingRoute: record('createDrivingRoute'),
    createWalkingRoute: record('createWalkingRoute'),
    createRidingRoute: record('createRidingRoute'),
    createTransitRoute: record('createTransitRoute'),
    createTruckRoute: record('createTruckRoute'),
    createBusLineSearch: record('createBusLineSearch'),
    createAutocomplete: record('createAutocomplete'),
  };
}

const Harness = defineComponent({
  name: 'PanelRefHarness',
  setup() {
    useLocalSearch({
      location: '北京',
      renderOptions: { panel: panels.localSearch, autoViewport: true },
    });
    useDrivingRoute({ renderOptions: { panel: panels.driving } });
    useWalkingRoute({ renderOptions: { panel: panels.walking } });
    useRidingRoute({ renderOptions: { panel: panels.riding } });
    useTransitRoute({ renderOptions: { panel: panels.transit } });
    useTruckRoute({ renderOptions: { panel: panels.truck } });
    useBusLineSearch({ renderOptions: { panel: panels.busLine } });
    useAutocomplete({ renderOptions: { panel: panels.autocomplete } });
    return () => null;
  },
});

let app: App | null = null;
let host: HTMLElement | null = null;

function mountWithFakeDriver() {
  const ctx = shallowRef<BMapContextValue>({
    status: 'ready',
    driver: makeFakeDriver() as never,
    version: '4.0',
    error: null,
  });
  app = createApp(defineComponent({
    setup() {
      provide(BMAP_KEY, ctx);
      return () => h(Harness);
    },
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
  app.mount(host);
}

/** 从 createXxx 入参里取出 renderOptions.panel（各 hook 入参形态不同，统一遍历一层）。 */
function panelOf(call: Call | undefined): unknown {
  if (!call) return undefined;
  for (const arg of call.args) {
    if (arg && typeof arg === 'object' && 'renderOptions' in arg) {
      return (arg as { renderOptions?: { panel?: unknown } }).renderOptions?.panel;
    }
  }
  return undefined;
}

function latestCall(name: string): Call | undefined {
  for (let i = calls.length - 1; i >= 0; i--) {
    if (calls[i].name === name) return calls[i];
  }
  return undefined;
}

describe('service hooks: panel 支持 Ref<HTMLElement>', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of PANEL_KEYS) panels[k].value = null;
    mountWithFakeDriver();
  });

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
  });

  it('8 个 hook 都创建了 service，且元素未就绪时不传 panel', () => {
    for (const name of Object.keys(METHOD_TO_PANEL)) {
      const call = latestCall(name);
      expect(call, `${name} 未被调用`).toBeDefined();
      expect(panelOf(call), `${name} 不应传 panel`).toBeUndefined();
    }
  });

  it('panel Ref 就绪后，8 个 hook 都把元素传给 driver（自动生效）', async () => {
    const els = Object.fromEntries(
      PANEL_KEYS.map((k) => [k, document.createElement('div')]),
    ) as Record<PanelKey, HTMLElement>;

    for (const k of PANEL_KEYS) panels[k].value = els[k];
    await nextTick();
    await nextTick();

    for (const [method, key] of Object.entries(METHOD_TO_PANEL)) {
      expect(panelOf(latestCall(method)), `${method} 应传入已就绪元素`).toBe(els[key]);
    }
  });
});
