/**
 * 把对象/数组序列化为稳定字符串，作为 effect 依赖用。
 * 处理 path 等每次 render 新引用的对象，避免覆盖物/服务无意义重建。
 * 遇到 DOM 元素 / 函数 / handle 时返回类型标记，不递归进去。
 *
 * undefined 与 null 输出不同标记：组件里「没传这个 prop」和「显式传 null」
 * 会走不同的 SDK 代码路径，依赖比较必须能区分，否则两者互换时 effect 不重跑。
 * 真正的循环引用由 seen 集合兜底（普通对象也可能自引用，光挡 DOM 不够）。
 */
export function stableStringify(value: unknown): string {
  return serialize(value, new WeakSet());
}

// 给 SDK handle 分配稳定且可区分的 id：
// stableStringify 不递归进 handle（内部是 SDK 实例，可能自引用/巨大），但不同 handle 实例
// 必须序列化成不同字符串，否则句柄型 prop（Marker icon / IconSequence symbol / Polyline node 等）
// 换成新 handle 时依赖比较判定“未变”，watch 不触发、更新丢失。
// 以 handle 内部 raw（底层 SDK 对象）为 key：包裹同一 raw 的新 wrapper 视为相同，raw 变了才算变。
const handleIds = new WeakMap<object, number>();
let handleSeq = 0;
function handleTag(value: object): string {
  const raw = (value as { raw?: unknown }).raw;
  const key = (raw && typeof raw === 'object') ? (raw as object) : value;
  let id = handleIds.get(key);
  if (id === undefined) {
    id = ++handleSeq;
    handleIds.set(key, id);
  }
  return `<handle#${id}>`;
}

function serialize(value: unknown, seen: WeakSet<object>): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function') return 'fn';
  if (typeof value !== 'object') return String(value);
  // DOM 元素 / 节点 — 不递归
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return '<HTMLElement>';
  if (typeof Node !== 'undefined' && value instanceof Node) return '<Node>';
  // 带品牌标记的 handle — 不递归，但按内部 raw 生成可区分的稳定 id
  if ('__brand' in (value as any)) return handleTag(value as object);
  if (seen.has(value as object)) return '<circular>';
  seen.add(value as object);
  // 只在「当前递归路径」上标记：同一个对象作为兄弟节点出现两次是合法的
  // （如 [point, point]），出栈后必须移除，否则会被误判成循环。
  let out: string;
  if (Array.isArray(value)) {
    out = `[${value.map(v => serialize(v, seen)).join(',')}]`;
  } else {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    out = `{${keys.map(k => `${k}:${serialize((value as Record<string, unknown>)[k], seen)}`).join(',')}}`;
  }
  seen.delete(value as object);
  return out;
}
