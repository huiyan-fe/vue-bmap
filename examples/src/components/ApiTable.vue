<script setup lang="ts">
import type { ApiProp } from '../config/apiData';

defineProps<{ data: ApiProp[] }>();
</script>

<template>
  <div class="api-table-wrap">
    <table v-if="data && data.length" class="api-table">
      <thead>
        <tr>
          <th>属性</th>
          <th>类型</th>
          <th>必填</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in data" :key="i">
          <td class="api-name">{{ row.name }}</td>
          <td class="api-type">{{ row.type }}</td>
          <td>{{ row.required ? '是' : '否' }}</td>
          <td class="api-desc">{{ row.description || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.api-table-wrap { overflow-x: auto; margin-top: 16px; }
.api-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.api-table th {
  padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; background: #f5f5f5;
}
.api-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
.api-name { font-family: monospace; }
.api-type { font-family: monospace; font-size: 12px; color: #6a5acd; }
.api-desc { color: #666; }
</style>
