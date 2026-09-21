import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// 抑制百度 JSAPI 自身在销毁期抛出的噪声错误（切换 demo 时残留瓦片回调读到已置空的内部引用）。
const SDK_SOURCE = /api\.map\.baidu\.com|\.bdimg\.com/;
window.addEventListener('error', (event) => {
  const stack = (event.error as Error | undefined)?.stack || '';
  const fromSDK = SDK_SOURCE.test(event.filename || '') || SDK_SOURCE.test(stack);
  if (fromSDK && /Cannot read propert(?:y|ies) of (?:null|undefined)/.test(event.message || '')) {
    event.preventDefault();
  }
}, true);

createApp(App).mount('#app');
