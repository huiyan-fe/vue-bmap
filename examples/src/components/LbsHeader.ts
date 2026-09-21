/**
 * 官网通栏头部（与 react-bmap examples 的 LbsHeader 同步）。
 *
 * LbsHeader 不是 npm 包，而是由外部 UMD 脚本（VITE_LBS_HEADER_URL）挂到全局
 * `window.lbsModuleSDK.LbsHeader` 上的 **React 组件**，脚本头部 `t(e.React, e.ReactDOM)`
 * 把 React/ReactDOM 当外部依赖从全局取。因此这里：
 * 1. 注入脚本前先把 window.React / window.ReactDOM 挂好；
 * 2. 拿到 React 组件后，用 react-dom/client 的 createRoot 挂到本组件的容器 div 上
 *    （Vue 树里无法直接渲染 React 组件，只能单独挂一个 React 根）。
 * 加载失败/未配置 URL 时静默降级为不渲染。
 */
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

const HEADER_URL = (import.meta as any).env?.VITE_LBS_HEADER_URL as string;

let pending: Promise<void> | undefined;
function loadScript(url: string): Promise<void> {
  if (!pending) {
    (window as any).React = React;
    (window as any).ReactDOM = ReactDOM;
    pending = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`failed to load script: ${url}`));
      document.head.appendChild(s);
    });
  }
  return pending;
}

export const LbsHeader = defineComponent({
  name: 'LbsHeader',
  setup() {
    const el = ref<HTMLElement | null>(null);
    let root: Root | null = null;

    onMounted(() => {
      if (!HEADER_URL) return;
      loadScript(HEADER_URL)
        .then(() => {
          const Comp = (window as any).lbsModuleSDK?.LbsHeader;
          if (!Comp) {
            console.error('[examples] 脚本已加载，但 window.lbsModuleSDK.LbsHeader 不存在');
            return;
          }
          if (!el.value) return;
          root = createRoot(el.value);
          root.render(React.createElement(Comp));
        })
        .catch((error: unknown) => console.error('[examples] LbsHeader 加载失败:', error));
    });

    onBeforeUnmount(() => { root?.unmount(); root = null; });

    return () => h('div', { class: 'app-lbs-header', ref: el });
  },
});
