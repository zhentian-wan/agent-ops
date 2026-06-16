<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import type { KpPoint } from '../composables/useKpIndex'

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  history: KpPoint[]
}>()

const container = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | undefined

function render(): void {
  if (!chart) return
  chart.setOption({
    grid: { left: 36, right: 16, top: 20, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v))
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 9,
      name: 'Kp',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'Kp',
        type: 'line',
        showSymbol: false,
        data: props.history.map((p) => [p.time.getTime(), p.kp]),
        lineStyle: { color: '#34d399', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 211, 153, 0.35)' },
            { offset: 1, color: 'rgba(52, 211, 153, 0)' }
          ])
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#facc15', type: 'dashed' },
          label: { color: '#facc15', formatter: '赫尔辛基可见门槛' },
          data: [{ yAxis: 4 }]
        }
      }
    ]
  })
}

function handleResize(): void {
  chart?.resize()
}

onMounted(() => {
  if (container.value) {
    chart = echarts.init(container.value)
    render()
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})

watch(() => props.history, render, { deep: false })
</script>

<template>
  <section class="card">
    <h3 class="card-title">过去 24 小时 Kp 变化</h3>
    <div ref="container" class="chart" />
  </section>
</template>

<style scoped>
.chart {
  width: 100%;
  height: 240px;
}
</style>
