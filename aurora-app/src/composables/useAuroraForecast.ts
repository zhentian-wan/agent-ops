import { computed } from 'vue'

import { HELSINKI } from '../lib/location'

import { fetchJson, usePolling } from './usePolling'

import type { ComputedRef, Ref } from 'vue'

const OVATION_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json'

/** NOAA 官方渲染的北半球极光椭圆最新图 */
export const OVATION_IMAGE_URL =
  'https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg'

interface OvationPayload {
  'Observation Time': string
  'Forecast Time': string
  /** [经度 0-359, 纬度 -90~90, 概率 0-100] */
  coordinates: [number, number, number][]
}

export interface AuroraForecastState {
  /** 赫尔辛基所在格点的极光出现概率 (0-100) */
  localProbability: ComputedRef<number | null>
  forecastTime: ComputedRef<Date | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<Date | null>
}

export function useAuroraForecast(intervalMs = 5 * 60 * 1000): AuroraForecastState {
  const { data, loading, error, lastUpdated } = usePolling(
    () => fetchJson<OvationPayload>(OVATION_URL),
    intervalMs
  )

  // OVATION 网格为 1°x1°，经度取 0-359（东经正向）
  const targetLon = Math.round(HELSINKI.longitude)
  const targetLat = Math.round(HELSINKI.latitude)

  const localProbability = computed<number | null>(() => {
    const coords = data.value?.coordinates
    if (!coords) return null
    const match = coords.find(([lon, lat]) => lon === targetLon && lat === targetLat)
    return match ? match[2] : null
  })

  const forecastTime = computed<Date | null>(() => {
    const t = data.value?.['Forecast Time']
    return t ? new Date(t) : null
  })

  return { localProbability, forecastTime, loading, error, lastUpdated }
}
