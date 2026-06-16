import { onMounted, onUnmounted, ref } from 'vue'

import type { Ref } from 'vue'

export interface PollingState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<Date | null>
  refresh: () => Promise<void>
}

/** 周期性拉取数据，组件卸载时自动停止。各数据源互相独立，互不影响。 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): PollingState<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  let timer: ReturnType<typeof setInterval> | undefined

  async function refresh(): Promise<void> {
    try {
      data.value = await fetcher()
      error.value = null
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void refresh()
    timer = setInterval(() => void refresh(), intervalMs)
  })
  onUnmounted(() => {
    if (timer !== undefined) clearInterval(timer)
  })

  return { data, loading, error, lastUpdated, refresh }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`请求失败 (${res.status}): ${url}`)
  }
  return (await res.json()) as T
}
