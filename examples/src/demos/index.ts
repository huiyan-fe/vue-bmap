import type { Component } from 'vue';

export interface DemoItem {
  /** 示例标题（同一页面多示例时用于区分） */
  title?: string;
  component?: Component;
  code: string;
}

const demos: Record<string, DemoItem[]> = {};

export function registerDemo(id: string, item: DemoItem): void {
  demos[id] = [...(demos[id] ?? []), item];
}

/** 获取某组件的全部示例（按 title 去重，防 HMR 模块重执行导致重复）。 */
export function getDemosById(id: string): DemoItem[] {
  const list = demos[id] ?? [];
  const map = new Map<string, DemoItem>();
  for (const d of list) map.set(d.title ?? '__untitled__', d);
  return [...map.values()];
}

export function getAllDemoIds(): string[] {
  return Object.keys(demos);
}
