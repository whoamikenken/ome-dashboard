import { ref } from 'vue'
import { startRecord, stopRecord, getRecordState } from '@/api/record'

export interface ScheduleConfig {
  enabled: boolean
  days: number[]
  startTime: string
  endTime: string
}

export interface StorageConfig {
  format: 'ts' | 'mp4'
  path: string
  retentionDays: number
}

const CONFIG_KEY = 'ome-auto-record-config'

export function useAutoRecord() {
  const autoRecordEnabled = ref<boolean>(false)
  const scheduleConfig = ref<ScheduleConfig>({
    enabled: false,
    days: [],
    startTime: '00:00',
    endTime: '23:59',
  })
  const storageConfig = ref<StorageConfig>({
    format: 'ts',
    path: '/recordings/{vhost}/{app}/{stream}_{date}',
    retentionDays: 30,
  })

  const isRecording = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  function loadConfig() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed) {
          autoRecordEnabled.value = typeof parsed.enabled === 'boolean' ? parsed.enabled : false
          if (parsed.schedule) {
            scheduleConfig.value = {
              enabled: typeof parsed.schedule.enabled === 'boolean' ? parsed.schedule.enabled : false,
              days: Array.isArray(parsed.schedule.days) ? parsed.schedule.days : [],
              startTime: parsed.schedule.startTime || '00:00',
              endTime: parsed.schedule.endTime || '23:59',
            }
          }
          if (parsed.storage) {
            storageConfig.value = {
              format: (parsed.storage.format === 'mp4' || parsed.storage.format === 'ts') ? parsed.storage.format : 'ts',
              path: parsed.storage.path || '/recordings/{vhost}/{app}/{stream}_{date}',
              retentionDays: typeof parsed.storage.retentionDays === 'number' ? parsed.storage.retentionDays : 30,
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load auto-record config from localStorage:', err)
    }
  }

  function saveConfig() {
    try {
      const configToSave = {
        enabled: autoRecordEnabled.value,
        schedule: scheduleConfig.value,
        storage: storageConfig.value,
      }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(configToSave))
    } catch (err: any) {
      console.error('Failed to save auto-record config to localStorage:', err)
    }
  }

  async function toggleAutoRecord() {
    autoRecordEnabled.value = !autoRecordEnabled.value
    saveConfig()
  }

  function setSchedule(config: Partial<ScheduleConfig>) {
    scheduleConfig.value = {
      ...scheduleConfig.value,
      ...config,
    }
    saveConfig()
  }

  function setStorage(config: Partial<StorageConfig>) {
    storageConfig.value = {
      ...storageConfig.value,
      ...config,
    }
    saveConfig()
  }

  async function checkStatus(vhost: string, app: string, streamName: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await getRecordState(vhost, app, { id: streamName })
      const record = res.response || res
      if (record && (record.state === 'started' || record.state === 'ready')) {
        isRecording.value = record.state === 'started'
      } else {
        isRecording.value = false
      }
    } catch (err: any) {
      isRecording.value = false
    } finally {
      isLoading.value = false
    }
  }

  async function startNow(vhost: string, app: string, streamName: string) {
    isLoading.value = true
    error.value = null
    try {
      let resolvedPath = storageConfig.value.path
      resolvedPath = resolvedPath
        .replace(/{vhost}/g, vhost)
        .replace(/{app}/g, app)
        .replace(/{stream}/g, streamName)
      
      const dateStr = new Date().toISOString().slice(0, 10)
      resolvedPath = resolvedPath.replace(/{date}/g, dateStr)

      const format = storageConfig.value.format
      if (!resolvedPath.endsWith(`.${format}`)) {
        resolvedPath = `${resolvedPath}.${format}`
      }

      await startRecord(vhost, app, {
        stream: { name: streamName },
        filePath: resolvedPath,
      })
      isRecording.value = true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to start recording'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function stopNow(vhost: string, app: string, streamName: string) {
    isLoading.value = true
    error.value = null
    try {
      await stopRecord(vhost, app, { id: streamName })
      isRecording.value = false
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to stop recording'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Load config on init
  loadConfig()

  return {
    autoRecordEnabled,
    scheduleConfig,
    storageConfig,
    isRecording,
    isLoading,
    error,
    toggleAutoRecord,
    setSchedule,
    setStorage,
    startNow,
    stopNow,
    loadConfig,
    saveConfig,
    checkStatus,
  }
}
