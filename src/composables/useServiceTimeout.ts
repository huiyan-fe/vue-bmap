/**
 * 检索类服务共用的「回调兜底」工具（composable 版）。
 * 百度 JSAPI 部分失败场景不触发回调，会导致 loading 永久卡住；本工具给每次请求挂超时。
 */
import { onScopeDispose } from 'vue';

export const SERVICE_TIMEOUT_MS = 10000;

export function serviceTimeoutError(): Error {
  return new Error('[vue-bmap] 服务请求超时：SDK 回调未返回，可能是 AK 未开通该服务、请求被拒或网络异常');
}

export interface ServiceTimeoutControl {
  arm: (onTimeout: () => void, ms?: number) => void;
  clear: () => void;
}

export function useServiceTimeout(): ServiceTimeoutControl {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const arm = (onTimeout: () => void, ms: number = SERVICE_TIMEOUT_MS) => {
    clear();
    timer = setTimeout(() => { timer = null; onTimeout(); }, ms);
  };
  onScopeDispose(clear);
  return { arm, clear };
}
