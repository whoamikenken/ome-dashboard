import { ref, onMounted, onUnmounted } from 'vue'
import { listVHosts } from '@/api/vhosts'
import { getVHostStats, getAppStats } from '@/api/stats'
import { listApps } from '@/api/apps'

export interface AppStats {
  name: string
  totalConnections: number
  throughput: number // bytes/sec
  uptime: string
  createdTime: string
}

export interface VHostStats {
  name: string
  totalConnections: number
  throughput: number // bytes/sec
  uptime: string
  createdTime: string
  apps: AppStats[]
}

export function useOmeStats(pollInterval = 5000) {
  const vhostsStats = ref<VHostStats[]>([])
  const throughputData = ref<{ timestamp: string; value: number }[]>([])
  const connectionData = ref<{ timestamp: string; value: number }[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  let timer: ReturnType<typeof setInterval> | null = null

  // Keep track of previous bytes & times to calculate throughput rates
  const prevVHostBytes = new Map<string, number>()
  const prevVHostTime = new Map<string, Date>()

  const prevAppBytes = new Map<string, number>()
  const prevAppTime = new Map<string, Date>()

  const prevTotalBytes = ref<number | null>(null)
  const prevTotalTime = ref<Date | null>(null)

  async function fetchStats() {
    try {
      error.value = null
      
      // 1. List all virtual hosts
      const vhostRes = await listVHosts()
      const vhostNames = vhostRes.response || []

      const nextVHostsStats: VHostStats[] = []
      let totalServerConnections = 0
      let totalServerBytes = 0
      const now = new Date()

      // 2. Fetch stats for each virtual host and its apps
      await Promise.all(
        vhostNames.map(async (vhostName) => {
          try {
            // Fetch vhost level stats
            const vhostStatsRes = await getVHostStats(vhostName)
            const vhStats = vhostStatsRes.response || {}

            const createdTime = vhStats.createdTime || ''
            const connections = vhStats.totalConnections || 0
            const bytesIn = vhStats.totalBytesIn || 0
            const bytesOut = vhStats.totalBytesOut || 0
            const totalBytes = bytesIn + bytesOut

            totalServerConnections += connections
            totalServerBytes += totalBytes

            // Calculate vhost throughput rate (bytes per second)
            let vhostThroughput = 0
            const prevBytes = prevVHostBytes.get(vhostName)
            const prevTime = prevVHostTime.get(vhostName)

            if (prevBytes !== undefined && prevTime !== undefined) {
              const timeDiff = (now.getTime() - prevTime.getTime()) / 1000
              const bytesDiff = totalBytes - prevBytes
              if (timeDiff > 0 && bytesDiff >= 0) {
                vhostThroughput = bytesDiff / timeDiff
              }
            }

            prevVHostBytes.set(vhostName, totalBytes)
            prevVHostTime.set(vhostName, now)

            // Fetch apps for this vhost
            let appStatsList: AppStats[] = []
            try {
              const appsRes = await listApps(vhostName)
              const appNames = appsRes.response || []

              await Promise.all(
                appNames.map(async (appName) => {
                  try {
                    const appStatsRes = await getAppStats(vhostName, appName)
                    const aStats = appStatsRes.response || {}

                    const appCreatedTime = aStats.createdTime || ''
                    const appConnections = aStats.totalConnections || 0
                    const appBytesIn = aStats.totalBytesIn || 0
                    const appBytesOut = aStats.totalBytesOut || 0
                    const appTotalBytes = appBytesIn + appBytesOut

                    // Calculate app throughput rate (bytes per second)
                    let appThroughput = 0
                    const appKey = `${vhostName}/${appName}`
                    const prevABytes = prevAppBytes.get(appKey)
                    const prevATime = prevAppTime.get(appKey)

                    if (prevABytes !== undefined && prevATime !== undefined) {
                      const timeDiff = (now.getTime() - prevATime.getTime()) / 1000
                      const bytesDiff = appTotalBytes - prevABytes
                      if (timeDiff > 0 && bytesDiff >= 0) {
                        appThroughput = bytesDiff / timeDiff
                      }
                    }

                    prevAppBytes.set(appKey, appTotalBytes)
                    prevAppTime.set(appKey, now)

                    appStatsList.push({
                      name: appName,
                      totalConnections: appConnections,
                      throughput: appThroughput,
                      uptime: formatUptime(appCreatedTime),
                      createdTime: appCreatedTime
                    })
                  } catch (err) {
                    console.error(`Failed to fetch stats for app ${appName} in vhost ${vhostName}`, err)
                  }
                })
              )
            } catch (err) {
              console.error(`Failed to fetch apps for vhost ${vhostName}`, err)
            }

            nextVHostsStats.push({
              name: vhostName,
              totalConnections: connections,
              throughput: vhostThroughput,
              uptime: formatUptime(createdTime),
              createdTime,
              apps: appStatsList
            })
          } catch (err) {
            console.error(`Failed to fetch stats for vhost ${vhostName}`, err)
          }
        })
      )

      // Ensure vhosts are in consistent order or sort them by name
      nextVHostsStats.sort((a, b) => a.name.localeCompare(b.name))
      vhostsStats.value = nextVHostsStats

      // 3. Compute total server throughput rate (bps for the ThroughputChart)
      let serverThroughputBps = 0
      if (prevTotalBytes.value !== null && prevTotalTime.value !== null) {
        const timeDiff = (now.getTime() - prevTotalTime.value.getTime()) / 1000
        const bytesDiff = totalServerBytes - prevTotalBytes.value
        if (timeDiff > 0 && bytesDiff >= 0) {
          // bytes per second to bits per second (bps)
          serverThroughputBps = (bytesDiff * 8) / timeDiff
        }
      }

      prevTotalBytes.value = totalServerBytes
      prevTotalTime.value = now

      // 4. Update Time-Series data
      const ts = now.toISOString()
      
      const nextThroughputData = [...throughputData.value, { timestamp: ts, value: serverThroughputBps }]
      if (nextThroughputData.length > 60) nextThroughputData.shift()
      throughputData.value = nextThroughputData

      const nextConnectionData = [...connectionData.value, { timestamp: ts, value: totalServerConnections }]
      if (nextConnectionData.length > 60) nextConnectionData.shift()
      connectionData.value = nextConnectionData

      lastUpdated.value = now
      isLoading.value = false
    } catch (err: any) {
      console.error('Error fetching statistics', err)
      error.value = err?.message || 'Failed to fetch OME statistics'
      isLoading.value = false
    }
  }

  function formatUptime(createdTimeStr?: string): string {
    if (!createdTimeStr) return '-'
    try {
      const created = new Date(createdTimeStr)
      const diffMs = Date.now() - created.getTime()
      if (diffMs < 0 || isNaN(diffMs)) return '-'
      
      const diffSecs = Math.floor(diffMs / 1000)
      const secs = diffSecs % 60
      const mins = Math.floor(diffSecs / 60) % 60
      const hours = Math.floor(diffSecs / 3600) % 24
      const days = Math.floor(diffSecs / 86400)
      
      const parts = []
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0 || days > 0) parts.push(`${hours}h`)
      if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`)
      parts.push(`${secs}s`)
      
      return parts.join(' ')
    } catch {
      return '-'
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
    vhostsStats,
    throughputData,
    connectionData,
    isLoading,
    error,
    lastUpdated,
    fetchStats
  }
}
