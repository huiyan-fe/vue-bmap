import { defineComponent, h } from 'vue';
import { Map } from '@baidumap/vue-bmap';

/** 包装 <Map>：统一给一个铺满容器的默认高度，并透传全部 props / 事件 / 子节点。 */
export const MapContainer = defineComponent({
  name: 'MapContainer',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h(
      Map as any,
      { style: { width: '100%', height: '100%' }, ...attrs },
      slots,
    );
  },
});
