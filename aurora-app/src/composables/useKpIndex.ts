import { computed } from 'vue'

import { fetchJson, usePolling } from './usePolling'

import type { ComputedRef, Ref } from 'vue'

const KP_1M_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
const KP_FORECAST_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'

interface Kp1mEntry {
  time_tag: string
  estimated_kp: number
  kp: string
}

interface KpForecastRaw {
  time_tag: string
  kp: number
  observed: 'observed' | 'estimated' | 'predicted'
  noaa_scale: string | null
}

export interface KpPoint {
  time: Date
  kp: number
}

export interface KpForecastEntry {
  time: Date
  kp: number
  kind: 'observed' | 'estimated' | 'predicted'
}

export interface KpIndexState {
  currentKp: ComputedRef<number | null>
  history: ComputedRef<KpPoint[]>
  forecast: ComputedRef<KpForecastEntry[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<Date | null>
}

interface KpPayload {
  history: KpPoint[]
  forecast: KpForecastEntry[]
}

async function fetchKp(): Promise<KpPayload> {
  const [raw1m, rawForecast] = await Promise.all([
    fetchJson<Kp1mEntry[]>(KP_1M_URL),
    fetchJson<KpForecastRaw[]>(KP_FORECAST_URL)
  ])

  const history: KpPoint[] = raw1m.map((e) => ({
    time: new Date(`${e.time_tag}Z`),
    kp: e.estimated_kp
  }))

  const forecast: KpForecastEntry[] = rawForecast
    .filter((e) => typeof e.kp === 'number' && !Number.isNaN(e.kp))
    .map((e) => ({
      time: new Date(`${e.time_tag}Z`),
      kp: e.kp,
      kind: e.observed
    }))

  return { history, forecast }
}

export function useKpIndex(intervalMs = 5 * 60 * 1000): KpIndexState {
  const { data, loading, error, lastUpdated } = usePolling(fetchKp, intervalMs)

  const history = computed<KpPoint[]>(() => {
    const points = data.value?.history ?? []
    const cutoff = Date.now() - 24 * 3600 * 1000
    return points.filter((p) => p.time.getTime() >= cutoff)
  })

  const currentKp = computed<number | null>(() => {
    const points = data.value?.history
    if (!points || points.length === 0) return null
    return points[points.length - 1]?.kp ?? null
  })

  const forecast = computed<KpForecastEntry[]>(() =>
    (data.value?.forecast ?? []).filter((e) => e.kind === 'predicted' || e.kind === 'estimated')
  )

  return { currentKp, history, forecast, loading, error, lastUpdated }
}
