import { ref, onMounted, onUnmounted } from 'vue'
import { listVHosts } from '@/api/vhosts'
import { listApps } from '@/api/apps'
import { listStreams } from '@/api/streams'

export interface DashboardStats {
  totalVHosts: number
  totalApps: number
  totalStreams: number
  activeStreams: number
  pushJobs: number
  activeRecordings: number
  vhostStreams: { name: string; count: number }[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useOmeStatus(pollInterval = 10000) {
  const connected = ref(false)
  const stats = ref<DashboardStats>({
    totalVHosts: 0,
    totalApps: 0,
    totalStreams: 0,
    activeStreams: 0,
    pushJobs: 0,
    activeRecordings: 0,
    vhostStreams: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  })

  let timer: ReturnType<typeof setInterval> | null = null

  async function fetchStats() {
    try {
      stats.value.error = null

      // Get all vhosts
      const vhostRes = await listVHosts()
      connected.value = true
      const vhostNames: string[] = vhostRes.response || vhostRes

      let totalApps = 0
      let totalStreams = 0
      let activeStreams = 0
      const vhostStreams: { name: string; count: number }[] = []

      // For each vhost, get apps concurrently
      await Promise.all(
        vhostNames.map(async (vhost) => {
          try {
            const appsRes = await listApps(vhost)
            const appNames: string[] = appsRes.response || appsRes

            let vhostStreamCount = 0

            // For each app, get streams concurrently
            await Promise.all(
              appNames.map(async (app) => {
                try {
                  const streamsRes = await listStreams(vhost, app)
                  const streamNames: string[] = streamsRes.response || streamsRes
                  vhostStreamCount += streamNames.length
                } catch {
                  // Skip apps that error
                }
              })
            )

            // Note: Since Promise.all executes concurrently, modifying shared variables
            // inside the map callbacks is safe in JS (single-threaded), but it's cleaner
            // to sum them up or push to the array. However, we'll keep it simple for now.
            totalApps += appNames.length
            totalStreams += vhostStreamCount
            activeStreams += vhostStreamCount

            vhostStreams.push({ name: vhost, count: vhostStreamCount })
          } catch {
            // Skip vhosts that error
          }
        })
      )

      // Sort vhostStreams to maintain consistent order as they might finish in any order
      vhostStreams.sort((a, b) => a.name.localeCompare(b.name))

      stats.value = {
        ...stats.value,
        totalVHosts: vhostNames.length,
        totalApps,
        totalStreams,
        activeStreams,
        vhostStreams,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      }
    } catch (err: any) {
      connected.value = false
      stats.value.error = err?.message || 'Failed to fetch OME stats'
      stats.value.isLoading = false
    }
  }

  function startPolling() {
    fetchStats()
    timer = setInterval(fetchStats, pollInterval)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    stats,
    connected,
    fetchStats,
    startPolling,
    stopPolling,
  }
}
