<script setup lang="ts">
import { computed } from 'vue'

import { LEVEL_COLOR, LEVEL_LABEL, kpLevelForHelsinki } from '../lib/visibility'

const props = defineProps<{
  kp: number | null
  auroraProbability: number | null
}>()

const level = computed(() => (props.kp === null ? null : kpLevelForHelsinki(props.kp)))
const color = computed(() => (level.value === null ? '#64748b' : LEVEL_COLOR[level.value]))
const label = computed(() => (level.value === null ? '—' : LEVEL_LABEL[level.value]))
/** 表盘指针角度：Kp 0-9 映射到 -120° ~ +120° */
const angle = computed(() => {
  const kp = props.kp ?? 0
  return -120 + (Math.min(kp, 9) / 9) * 240
})
</script>

<template>
  <section class="card gauge">
    <h3 class="card-title">当前 Kp 指数</h3>
    <div class="gauge-dial">
      <div class="gauge-needle" :style="{ transform: `rotate(${angle}deg)`, background: color }" />
      <div class="gauge-value" :style="{ color }">
        {{ kp === null ? '—' : kp.toFixed(1) }}
      </div>
    </div>
    <p class="gauge-label">
      赫尔辛基可见性：<strong :style="{ color }">{{ label }}</strong>
    </p>
    <p v-if="auroraProbability !== null" class="gauge-prob">
      30 分钟短时预报（OVATION）：本地极光概率
      <strong>{{ Math.round(auroraProbability) }}%</strong>
    </p>
  </section>
</template>

<style scoped>
.gauge-dial {
  position: relative;
  width: 160px;
  height: 100px;
  margin: 0.5rem auto;
  border-radius: 160px 160px 0 0;
  background: radial-gradient(circle at 50% 100%, #1e293b 55%, transparent 56%),
    conic-gradient(
      from -120deg at 50% 100%,
      #64748b 0deg,
      #facc15 100deg,
      #fb923c 160deg,
      #34d399 240deg,
      transparent 240deg
    );
  overflow: hidden;
}
.gauge-needle {
  position: absolute;
  left: calc(50% - 2px);
  bottom: 0;
  width: 4px;
  height: 90px;
  transform-origin: 50% 100%;
  border-radius: 2px;
  transition: transform 0.6s ease;
}
.gauge-value {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
}
.gauge-label,
.gauge-prob {
  margin: 0.3rem 0;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9rem;
}
</style>
