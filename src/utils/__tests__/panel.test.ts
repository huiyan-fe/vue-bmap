import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { resolvePanelTarget } from '../panel';

describe('resolvePanelTarget', () => {
  it('panel 传 Ref：就绪前移除 panel 键，就绪后写入元素', () => {
    const el = { tagName: 'DIV' } as unknown as HTMLElement;
    const panel = ref<HTMLElement | null>(null);
    const buildRo = () => ({ panel, autoViewport: true }) as Record<string, unknown>;

    const before = buildRo();
    resolvePanelTarget(before);
    expect('panel' in before).toBe(false);
    expect(before.autoViewport).toBe(true);

    panel.value = el;
    const after = buildRo();
    resolvePanelTarget(after);
    expect(after.panel).toBe(panel.value);
  });

  it('panel 传元素/字符串：原样保留', () => {
    const el = { tagName: 'DIV' } as unknown as HTMLElement;
    const byEl: Record<string, unknown> = { panel: el };
    const byId: Record<string, unknown> = { panel: 'r-result' };
    resolvePanelTarget(byEl);
    resolvePanelTarget(byId);
    expect(byEl.panel).toBe(el);
    expect(byId.panel).toBe('r-result');
  });

  it('没有 panel 时不新增键', () => {
    const ro: Record<string, unknown> = { autoViewport: true };
    resolvePanelTarget(ro);
    expect('panel' in ro).toBe(false);
  });
});
