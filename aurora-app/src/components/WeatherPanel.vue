<script setup lang="ts">
import { computed } from 'vue'

import type { HourlyWeather } from '../composables/useWeather'

const props = defineProps<{
  currentCloudCover: number | null
  currentTemperature: number | null
  hourly: HourlyWeather[]
}>()

function cloudIcon(cover: number): string {
  if (cover <= 25) return '晴'
  if (cover <= 50) return '少云'
  if (cover <= 80) return '多云'
  return '阴'
}

function cloudColor(cover: number): string {
  if (cover <= 25) return '#34d399'
  if (cover <= 50) return '#a3e635'
  if (cover <= 80) return '#facc15'
  return '#64748b'
}

const rows = computed(() =>
  props.hourly.map((h) => ({
    ...h,
    hour: h.time.slice(11, 16),
    icon: cloudIcon(h.cloudCover),
    color: cloudColor(h.cloudCover)
  }))
)
</script>

<template>
  <section class="card">
    <h3 class="card-title">赫尔辛基观测天气</h3>
    <div class="now">
      <span>
        当前云量：
        <strong>{{ currentCloudCover === null ? '—' : `${Math.round(currentCloudCover)}%` }}</strong>
      </span>
      <span>
        气温：
        <strong>
          {{ currentTemperature === null ? '—' : `${currentTemperature.toFixed(1)}°C` }}
        </strong>
      </span>
    </div>
    <p v-if="rows.length === 0" class="empty">暂无天气数据</p>
    <div v-else class="hours">
      <div v-for="row in rows" :key="row.time" class="hour">
        <span class="hour-time">{{ row.hour }}</span>
        <span class="hour-icon" :style="{ color: row.color }">{{ row.icon }}</span>
        <span class="hour-cloud" :style="{ color: row.color }">{{ Math.round(row.cloudCover) }}%</span>
        <span class="hour-temp">{{ Math.round(row.temperature) }}°</span>
      </div>
    </div>
    <p class="hint">出门看极光记得保暖，远离城市灯光、面向北方视野开阔处效果最佳。</p>
  </section>
</template>

<style scoped>
.now {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.8rem;
  color: var(--text);
}
.hours {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;
}
.hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 52px;
  padding: 0.4rem 0.2rem;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  font-size: 0.8rem;
}
.hour-time {
  color: var(--text-dim);
}
.hour-temp {
  color: var(--text);
}
.hint {
  margin: 0.6rem 0 0;
  color: var(--text-dim);
  font-size: 0.85rem;
}
.empty {
  color: var(--text-dim);
}
</style>
