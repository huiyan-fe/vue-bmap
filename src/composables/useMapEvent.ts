import { onScopeDispose, watch } from 'vue';
import { useMapContext } from '../context';

/**
 * 订阅 Map 事件。handler 始终读最新引用；map 就绪后自动绑定，卸载时退订。
 */
export function useMapEvent(type: string, handler: (raw: unknown) => void): void {
  const ctx = useMapContext();
  let unsub: (() => void) | null = null;
  const bind = () => {
    unsub?.(); unsub = null;
    const c = ctx.value;
    if (!c?.map) return;
    unsub = c.driver.addEventListener(c.map, type, (raw) => handler(raw));
  };
  watch(() => ctx.value?.map, bind, { immediate: true });
  onScopeDispose(() => { unsub?.(); unsub = null; });
}
