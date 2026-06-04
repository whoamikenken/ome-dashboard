import { ref, onMounted, onUnmounted } from 'vue'
import { listVHosts } from '@/api/vhosts'
import { listApps } from '@/api/apps'
import { listStreams, getStream } from '@/api/streams'
import type { Stream } from '@/types/ome'

export interface StreamEntry {
  name: string
  vhost: string
  app: string
  sourceType: string
  sourceUrl: string
  createdTime: string
  videoTracks: number
  audioTracks: number
  detail?: Stream
}

export function useAllStreams(pollInterval = 15000) {
  const streams = ref<StreamEntry[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  let timer: ReturnType<typeof setInterval> | null = null

  async function fetchAllStreams() {
    isLoading.value = true
    error.value = null
    const allStreams: StreamEntry[] = []

    try {
      // 1. Get all vhosts
      const vhostRes = await listVHosts()
      const vhostNames: string[] = (vhostRes as any).response || vhostRes

      // 2. For each vhost, get apps
      for (const vhost of vhostNames) {
        try {
          const appsRes = await listApps(vhost)
          const appNames: string[] = (appsRes as any).response || appsRes

          // 3. For each app, get streams
          for (const app of appNames) {
            try {
              const streamsRes = await listStreams(vhost, app)
              const streamNames: string[] = (streamsRes as any).response || streamsRes

              for (const name of streamNames) {
                let detail: Stream | undefined
                try {
                  const detailRes = await getStream(vhost, app, name)
                  detail = (detailRes as any).response || detailRes
                } catch { /* skip detail errors */ }

                allStreams.push({
                  name,
                  vhost,
                  app,
                  sourceType: detail?.input?.sourceType || '',
                  sourceUrl: detail?.input?.sourceUrl || '',
                  createdTime: detail?.input?.createdTime || '',
                  videoTracks: detail?.input?.tracks?.video?.length || 0,
                  audioTracks: detail?.input?.tracks?.audio?.length || 0,
                  detail,
                })
              }
            } catch { /* skip app errors */ }
          }
        } catch { /* skip vhost errors */ }
      }

      streams.value = allStreams
      lastUpdated.value = new Date()
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch streams'
    } finally {
      isLoading.value = false
    }
  }

  function startPolling() {
    fetchAllStreams()
    timer = setInterval(fetchAllStreams, pollInterval)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => startPolling())
  onUnmounted(() => stopPolling())

  return {
    streams,
    isLoading,
    error,
    lastUpdated,
    fetchAllStreams,
    startPolling,
    stopPolling,
  }
}
