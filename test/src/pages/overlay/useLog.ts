import { ref } from 'vue';

/** 测试页共用：事件日志（最多 20 条，最新在前）。 */
export function useLog() {
  const eventLog = ref<string[]>([]);
  const log = (msg: string) => {
    eventLog.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...eventLog.value].slice(0, 20);
  };
  const fmt = (pt: any) => (pt ? `${pt.lng?.toFixed(4)},${pt.lat?.toFixed(4)}` : '');
  return { eventLog, log, fmt };
}
