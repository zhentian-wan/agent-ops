import { computed } from 'vue'

import { HELSINKI } from '../lib/location'

import { fetchJson, usePolling } from './usePolling'

import type { ComputedRef, Ref } from 'vue'

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${HELSINKI.latitude}&longitude=${HELSINKI.longitude}` +
  '&current=cloud_cover,temperature_2m' +
  '&hourly=cloud_cover,temperature_2m' +
  `&timezone=${encodeURIComponent(HELSINKI.timezone)}` +
  '&forecast_days=2'

interface OpenMeteoPayload {
  current: {
    cloud_cover: number
    temperature_2m: number
  }
  hourly: {
    time: string[]
    cloud_cover: number[]
    temperature_2m: number[]
  }
}

export interface HourlyWeather {
  /** 当地时间 ISO 字符串，如 2026-06-12T22:00 */
  time: string
  cloudCover: number
  temperature: number
}

export interface WeatherState {
  currentCloudCover: ComputedRef<number | null>
  currentTemperature: ComputedRef<number | null>
  /** 从当前小时起未来 24 小时的逐小时云量/气温 */
  hourly: ComputedRef<HourlyWeather[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<Date | null>
}

export function useWeather(intervalMs = 15 * 60 * 1000): WeatherState {
  const { data, loading, error, lastUpdated } = usePolling(
    () => fetchJson<OpenMeteoPayload>(WEATHER_URL),
    intervalMs
  )

  const currentCloudCover = computed(() => data.value?.current.cloud_cover ?? null)
  const currentTemperature = computed(() => data.value?.current.temperature_2m ?? null)

  const hourly = computed<HourlyWeather[]>(() => {
    const h = data.value?.hourly
    if (!h) return []
    const now = Date.now()
    const result: HourlyWeather[] = []
    for (let i = 0; i < h.time.length; i++) {
      const time = h.time[i]
      const cloudCover = h.cloud_cover[i]
      const temperature = h.temperature_2m[i]
      if (time === undefined || cloudCover === undefined || temperature === undefined) continue
      // Open-Meteo 返回的是当地时间（无时区后缀），用于展示即可；
      // 过滤时允许 1 小时误差，保证“当前小时”也被包含。
      if (new Date(time).getTime() < now - 3600 * 1000) continue
      result.push({ time, cloudCover, temperature })
      if (result.length >= 24) break
    }
    return result
  })

  return { currentCloudCover, currentTemperature, hourly, loading, error, lastUpdated }
}
