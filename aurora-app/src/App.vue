<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import ForecastPanel from './components/ForecastPanel.vue'
import KpGauge from './components/KpGauge.vue'
import KpHistoryChart from './components/KpHistoryChart.vue'
import OvationMap from './components/OvationMap.vue'
import VerdictCard from './components/VerdictCard.vue'
import WeatherPanel from './components/WeatherPanel.vue'
import { useAuroraForecast } from './composables/useAuroraForecast'
import { useKpIndex } from './composables/useKpIndex'
import { useWeather } from './composables/useWeather'
import { HELSINKI } from './lib/location'
import { sunElevation } from './lib/solar'
import { assessVisibility } from './lib/visibility'

const kpState = useKpIndex()
const auroraState = useAuroraForecast()
const weatherState = useWeather()

// 每分钟重算一次太阳高度角，保证天色判断实时
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 60 * 1000)
})
onUnmounted(() => {
  if (clockTimer !== undefined) clearInterval(clockTimer)
})

const verdict = computed(() =>
  assessVisibility({
    kp: kpState.currentKp.value,
    sunElevation: sunElevation(now.value, HELSINKI.latitude, HELSINKI.longitude),
    cloudCover: weatherState.currentCloudCover.value,
    auroraProbability: auroraState.localProbability.value
  })
)

const errors = computed(() =>
  [
    kpState.error.value && `Kp 数据：${kpState.error.value}`,
    auroraState.error.value && `OVATION 数据：${auroraState.error.value}`,
    weatherState.error.value && `天气数据：${weatherState.error.value}`
  ].filter((e): e is string => Boolean(e))
)

const initialLoading = computed(
  () => kpState.loading.value && auroraState.loading.value && weatherState.loading.value
)

const lastUpdatedText = computed(() => {
  const t = kpState.lastUpdated.value
  return t ? t.toLocaleTimeString('zh-CN') : null
})
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>极光预测 · {{ HELSINKI.name }}</h1>
      <p class="subtitle">
        数据来源：NOAA SWPC + Open-Meteo，每 5 分钟自动刷新
        <template v-if="lastUpdatedText">（上次更新 {{ lastUpdatedText }}）</template>
      </p>
    </header>

    <div v-if="errors.length > 0" class="errors">
      <p v-for="err in errors" :key="err">{{ err }}</p>
    </div>

    <p v-if="initialLoading" class="loading">正在加载太空天气数据……</p>

    <main v-else class="grid">
      <VerdictCard class="span-2" :verdict="verdict" />
      <KpGauge :kp="kpState.currentKp.value" :aurora-probability="auroraState.localProbability.value" />
      <WeatherPanel
        :current-cloud-cover="weatherState.currentCloudCover.value"
        :current-temperature="weatherState.currentTemperature.value"
        :hourly="weatherState.hourly.value"
      />
      <KpHistoryChart class="span-2" :history="kpState.history.value" />
      <ForecastPanel class="span-2" :forecast="kpState.forecast.value" />
      <OvationMap class="span-2" :forecast-time="auroraState.forecastTime.value" />
    </main>

    <footer class="footer">
      <p>
        极光观测小贴士：Kp ≥ 4 时往北看，远离市区灯光（如 Lauttasaari 海边、Uutela
        自然公园），秋冬季晴朗的午夜前后机会最大。
      </p>
    </footer>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
.header h1 {
  margin: 0;
  font-size: 1.6rem;
  background: linear-gradient(90deg, #34d399, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.subtitle {
  margin: 0.3rem 0 1.2rem;
  color: var(--text-dim);
  font-size: 0.85rem;
}
.errors {
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  border: 1px solid #f87171;
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.1);
  color: #fca5a5;
  font-size: 0.85rem;
}
.errors p {
  margin: 0.2rem 0;
}
.loading {
  color: var(--text-dim);
}
.grid {
  display: grid;
  /* minmax(0, 1fr) 防止天气面板的横向滚动列表把列撑宽、溢出容器 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.span-2 {
  grid-column: span 2;
}
@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}
.footer {
  margin-top: 1.5rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
