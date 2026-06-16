<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { OVATION_IMAGE_URL } from '../composables/useAuroraForecast'

defineProps<{
  forecastTime: Date | null
}>()

// 加 cache-busting 参数，让图片随数据更新（NOAA 约每 5 分钟刷新一次）
const imageUrl = ref(withTimestamp())
const failed = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function withTimestamp(): string {
  return `${OVATION_IMAGE_URL}?t=${Date.now()}`
}

onMounted(() => {
  timer = setInterval(() => {
    imageUrl.value = withTimestamp()
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (timer !== undefined) clearInterval(timer)
})
</script>

<template>
  <section class="card">
    <h3 class="card-title">极光椭圆实况（北半球 · NOAA OVATION）</h3>
    <img
      v-if="!failed"
      :src="imageUrl"
      alt="NOAA OVATION 北半球极光椭圆预报图"
      class="ovation-img"
      loading="lazy"
      @error="failed = true"
    />
    <p v-else class="empty">极光椭圆图加载失败，稍后会自动重试</p>
    <p class="hint">
      绿色到红色区域表示极光出现概率，找到芬兰的位置即可估计极光带是否压到赫尔辛基上空。
      <template v-if="forecastTime"> 预报时刻：{{ forecastTime.toLocaleString('zh-CN') }}</template>
    </p>
  </section>
</template>

<style scoped>
.ovation-img {
  display: block;
  width: 100%;
  border-radius: 8px;
}
.hint {
  margin: 0.6rem 0 0;
  color: var(--text-dim);
  font-size: 0.85rem;
  line-height: 1.5;
}
.empty {
  color: var(--text-dim);
}
</style>
