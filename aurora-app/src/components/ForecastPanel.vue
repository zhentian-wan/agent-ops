<script setup lang="ts">
import { computed } from 'vue'

import { HELSINKI } from '../lib/location'
import { LEVEL_COLOR, LEVEL_LABEL, kpLevelForHelsinki } from '../lib/visibility'

import type { KpForecastEntry } from '../composables/useKpIndex'

const props = defineProps<{
  forecast: KpForecastEntry[]
}>()

interface DayGroup {
  day: string
  entries: { hour: string; kp: number; color: string; label: string }[]
}

const dayFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: HELSINKI.timezone,
  month: 'short',
  day: 'numeric',
  weekday: 'short'
})
const hourFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: HELSINKI.timezone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

const groups = computed<DayGroup[]>(() => {
  const map = new Map<string, DayGroup>()
  for (const entry of props.forecast) {
    const day = dayFormatter.format(entry.time)
    let group = map.get(day)
    if (!group) {
      group = { day, entries: [] }
      map.set(day, group)
    }
    const level = kpLevelForHelsinki(entry.kp)
    group.entries.push({
      hour: hourFormatter.format(entry.time),
      kp: entry.kp,
      color: LEVEL_COLOR[level],
      label: LEVEL_LABEL[level]
    })
  }
  return [...map.values()]
})
</script>

<template>
  <section class="card">
    <h3 class="card-title">未来 3 天 Kp 预报（NOAA，赫尔辛基时间）</h3>
    <p v-if="groups.length === 0" class="empty">暂无预报数据</p>
    <div v-for="group in groups" :key="group.day" class="day-group">
      <h4 class="day-title">{{ group.day }}</h4>
      <div class="slots">
        <div
          v-for="entry in group.entries"
          :key="entry.hour"
          class="slot"
          :style="{ borderColor: entry.color }"
        >
          <span class="slot-hour">{{ entry.hour }}</span>
          <span class="slot-kp" :style="{ color: entry.color }">{{ entry.kp.toFixed(2) }}</span>
          <span class="slot-label" :style="{ color: entry.color }">{{ entry.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.day-group {
  margin-bottom: 0.8rem;
}
.day-title {
  margin: 0.4rem 0;
  color: var(--text);
  font-size: 0.95rem;
}
.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 0.5rem;
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0.2rem;
  border: 1px solid;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
}
.slot-hour {
  color: var(--text-dim);
  font-size: 0.75rem;
}
.slot-kp {
  font-size: 1.1rem;
  font-weight: 700;
}
.slot-label {
  font-size: 0.75rem;
}
.empty {
  color: var(--text-dim);
}
</style>
