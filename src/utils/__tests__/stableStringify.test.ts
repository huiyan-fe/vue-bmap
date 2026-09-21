import { describe, it, expect } from 'vitest';
import { stableStringify } from '../stableStringify';

// 模拟 SDK handle 结构（{__brand, raw, type}），验证句柄型依赖比较。
const makeHandle = (raw: unknown) => ({ __brand: 'OverlayHandle', raw, type: 'icon' });

describe('stableStringify', () => {
  it('普通对象/数组按值稳定序列化，字段顺序无关', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
  });

  it('区分 undefined 与 null', () => {
    expect(stableStringify(undefined)).not.toBe(stableStringify(null));
  });

  it('不同 handle 实例序列化结果不同（句柄型 prop 换新实例能触发更新）', () => {
    const a = makeHandle({ sdk: 'A' });
    const b = makeHandle({ sdk: 'B' });
    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  it('包裹同一 raw 的不同 wrapper 序列化结果相同（避免无意义重建）', () => {
    const raw = { sdk: 'same' };
    expect(stableStringify(makeHandle(raw))).toBe(stableStringify(makeHandle(raw)));
  });

  it('同一 handle 多次序列化稳定', () => {
    const h = makeHandle({ sdk: 'X' });
    expect(stableStringify(h)).toBe(stableStringify(h));
  });
});
