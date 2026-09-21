import { defineComponent, h, ref } from 'vue';
import { useGeocoder } from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };

// 浮层面板样式（与 react-bmap serviceDemos 的 panelStyle 一致）
const panelStyle = {
  position: 'absolute', top: '10px', left: '10px', zIndex: 10,
  background: '#fff', padding: '12px', borderRadius: '6px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxWidth: '320px', fontSize: '13px',
} as const;
const inputStyle = { flex: 1, padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' } as const;
const btnStyle = { padding: '4px 12px', border: '1px solid #1890ff', background: '#1890ff', color: '#fff', borderRadius: '4px', cursor: 'pointer' } as const;

// ─── useGeocoder ───
const GeocoderInner = defineComponent({
  name: 'GeocoderInner',
  setup() {
    const addr = ref('天安门');
    const { data, loading, error, getPoint } = useGeocoder();
    const resultText = () => {
      if (error.value) return `❌ ${error.value.message}`;
      if (data.value) {
        try { return JSON.stringify(data.value, (_k, v) => (typeof v === 'function' ? '<fn>' : v)).slice(0, 300); }
        catch { return String(data.value); }
      }
      return '输入地址';
    };
    return () => h('div', { style: panelStyle }, [
      h('div', { style: { display: 'flex', gap: '4px' } }, [
        h('input', {
          value: addr.value, style: inputStyle,
          onInput: (e: any) => { addr.value = e.target.value; },
          onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') getPoint(addr.value); },
        }),
        h('button', { style: btnStyle, onClick: () => getPoint(addr.value) }, loading.value ? '...' : '编码'),
      ]),
      h('div', { style: { marginTop: '6px', color: error.value ? '#f5222d' : '#666', wordBreak: 'break-all' } }, resultText()),
    ]);
  },
});

registerDemo('geocoder', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(GeocoderInner)] }),
  }),
  code: `<script setup>
import { useGeocoder } from '@baidumap/vue-bmap';
const { data, getPoint } = useGeocoder();
getPoint('天安门'); // 地址 → 坐标
<\/script>`,
});
