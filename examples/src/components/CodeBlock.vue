<script setup lang="ts">
import { computed, ref } from 'vue';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

const props = withDefaults(defineProps<{ code: string; language?: string }>(), {
  language: 'markup',
});

const highlighted = computed(() => {
  const grammar = Prism.languages[props.language] ?? Prism.languages.markup;
  return Prism.highlight(props.code, grammar, props.language);
});

const copied = ref(false);
const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch { /* ignore */ }
};
</script>

<template>
  <div class="code-block">
    <button class="code-copy" type="button" @click="copy">{{ copied ? '已复制' : '复制' }}</button>
    <pre :class="`language-${language}`"><code v-html="highlighted" /></pre>
  </div>
</template>

<style scoped>
.code-block { position: relative; margin-top: 8px; }
.code-copy {
  position: absolute; right: 8px; top: 8px; z-index: 1;
  padding: 4px 10px; font-size: 12px; border: 1px solid #444; border-radius: 4px;
  background: rgba(255, 255, 255, 0.08); color: #ccc; cursor: pointer;
}
.code-copy:hover { background: rgba(255, 255, 255, 0.16); }
.code-block :deep(pre[class*='language-']) {
  margin: 0; border-radius: 6px; font-size: 13px; line-height: 1.6;
}
</style>
