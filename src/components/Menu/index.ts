/**
 * ContextMenu + MenuItem 组件。对应 react-bmap 的 Menu/index.tsx。
 *
 * - <ContextMenu> 读 OVERLAY_TARGET_KEY 决定挂到 map 或 overlay（如 Marker）
 * - <MenuItem> 通过 CONTEXT_MENU_KEY 找到父菜单，调 addMenuItem
 *
 * 父子关系：ContextMenu 创建菜单实例后，通过 provide(CONTEXT_MENU_KEY, shallowRef(menu))
 * 下发；MenuItem 用 inject(CONTEXT_MENU_KEY) 拿到菜单句柄（响应式，watch 即可感知就绪）后注册菜单项。
 */
import {
  defineComponent, inject, onUnmounted, provide, shallowRef, watch,
  type InjectionKey, type PropType, type ShallowRef,
} from 'vue';
import { MAP_KEY, OVERLAY_TARGET_KEY } from '../../context';
import type { MapHandle, OverlayHandle } from '../../types';

/** ContextMenu → MenuItem 的注入键：下发已创建的菜单句柄（未就绪时为 null）。 */
const CONTEXT_MENU_KEY: InjectionKey<ShallowRef<OverlayHandle | null>> = Symbol('vue-bmap:context-menu');

export interface ContextMenuProps {
  // 仅接收 slots（子级 MenuItem）
}

export const ContextMenu = defineComponent({
  name: 'ContextMenu',
  setup(_props, { slots }) {
    const mapCtx = inject(MAP_KEY, null);
    const target = inject(OVERLAY_TARGET_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <ContextMenu> 必须用在 <Map> 内部');

    const menuStore = shallowRef<OverlayHandle | null>(null);
    provide(CONTEXT_MENU_KEY, menuStore);

    let menu: OverlayHandle | null = null;
    let attached: { target: MapHandle | OverlayHandle; menu: OverlayHandle } | null = null;

    // 挂载目标：优先父级 overlay（如 Marker），否则地图本身
    const targetHandle = (): MapHandle | OverlayHandle | null =>
      (target?.handle.value ?? mapCtx.value?.map ?? null) as MapHandle | OverlayHandle | null;

    const attach = () => {
      const ctx = mapCtx.value;
      const tgt = targetHandle();
      if (!ctx?.driver || !tgt) return;

      // menu 只创建一次
      if (!menu) {
        const m = ctx.driver.createContextMenu({});
        if (!m) return;
        menu = m;
        menuStore.value = m;
      }
      // 已 attach 到同一 target：跳过
      if (attached?.target === tgt && attached?.menu === menu) return;
      // target 变了：先 detach 旧的，再 attach 新的
      if (attached) ctx.driver.removeContextMenu(attached.target, attached.menu);
      ctx.driver.addContextMenu(tgt, menu);
      attached = { target: tgt, menu };
    };

    const detach = () => {
      const ctx = mapCtx.value;
      if (ctx?.driver && attached) {
        try { ctx.driver.removeContextMenu(attached.target, attached.menu); } catch { /* ignore */ }
      }
      attached = null;
      menu = null;
      menuStore.value = null;
    };

    watch([() => mapCtx.value?.map, () => target?.handle.value], attach, { immediate: true });
    onUnmounted(detach);

    return () => (slots.default ? slots.default() : null);
  },
});

export interface MenuItemProps {
  text: string;
  callback?: (point?: { lng: number; lat: number }) => void;
  iconWidth?: number;
}

export const MenuItem = defineComponent({
  name: 'MenuItem',
  props: {
    text: { type: String, required: true },
    callback: { type: Function as PropType<(point?: { lng: number; lat: number }) => void>, default: undefined },
    iconWidth: { type: Number, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    const menuStore = inject(CONTEXT_MENU_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <MenuItem> 必须用在 <Map> 内部');

    let item: OverlayHandle | null = null;
    let boundMenu: OverlayHandle | null = null;

    const create = () => {
      const ctx = mapCtx.value;
      const menu = menuStore?.value ?? null;
      if (!ctx?.driver || !menu) return;
      const it = ctx.driver.createMenuItem(
        props.text,
        (point?: { lng: number; lat: number }) => { const cb = props.callback; if (typeof cb === 'function') cb(point); },
        { iconWidth: props.iconWidth },
      );
      if (!it) return;
      item = it;
      boundMenu = menu;
      ctx.driver.addMenuItem(menu, it);
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (ctx?.driver && boundMenu && item) {
        try { ctx.driver.removeMenuItem(boundMenu, item); } catch { /* ignore */ }
      }
      item = null;
      boundMenu = null;
    };

    const recreate = () => { destroy(); create(); };

    // 菜单就绪 / text / iconWidth 变化时重建菜单项
    watch([() => menuStore?.value, () => props.text, () => props.iconWidth], recreate, { immediate: true });
    onUnmounted(destroy);

    return () => null;
  },
});
