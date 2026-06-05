import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { StreamHistoryEntry, HistoryFilter, HistoryStats } from '@/types/history'

const DB_NAME = 'ome-dashboard'
const STORE_NAME = 'stream-history'
const DB_VERSION = 2

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: false })
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function useStreamHistory() {
  const entries = ref<StreamHistoryEntry[]>([]) as Ref<StreamHistoryEntry[]>
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      const result = await new Promise<StreamHistoryEntry[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      // Sort by startTime desc
      result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

      entries.value = result
      db.close()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch stream history'
      console.error('refresh error:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function addEntry(entry: Omit<StreamHistoryEntry, 'id'>): Promise<string> {
    error.value = null
    try {
      const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString()

      const newEntry: StreamHistoryEntry = {
        ...entry,
        id,
      }

      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.add(newEntry)

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      // Insert and keep sorted
      entries.value = [newEntry, ...entries.value].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )

      return id
    } catch (err: any) {
      error.value = err.message || 'Failed to add stream history entry'
      console.error('addEntry error:', err)
      throw err
    }
  }

  async function updateEntry(id: string, updates: Partial<StreamHistoryEntry>): Promise<void> {
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      const existing = await new Promise<StreamHistoryEntry | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!existing) {
        throw new Error(`History entry with ID ${id} not found`)
      }

      const updatedEntry: StreamHistoryEntry = {
        ...existing,
        ...updates,
        id, // preserve ID
      }

      store.put(updatedEntry)

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      // Update local ref
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        const newEntries = [...entries.value]
        newEntries[index] = updatedEntry
        entries.value = newEntries.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update stream history entry'
      console.error('updateEntry error:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      entries.value = entries.value.filter(e => e.id !== id)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete stream history entry'
      console.error('deleteEntry error:', err)
      throw err
    }
  }

  async function clearHistory(): Promise<void> {
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      entries.value = []
    } catch (err: any) {
      error.value = err.message || 'Failed to clear stream history'
      console.error('clearHistory error:', err)
      throw err
    }
  }

  function getFiltered(filter: HistoryFilter): StreamHistoryEntry[] {
    let result = [...entries.value]

    if (filter.vhost) {
      result = result.filter(e => e.vhost === filter.vhost)
    }
    if (filter.app) {
      result = result.filter(e => e.app === filter.app)
    }
    if (filter.streamName) {
      const q = filter.streamName.toLowerCase()
      result = result.filter(e => e.streamName.toLowerCase().includes(q))
    }
    if (filter.status) {
      result = result.filter(e => e.status === filter.status)
    }
    if (filter.dateFrom) {
      const fromTime = new Date(filter.dateFrom).getTime()
      if (!isNaN(fromTime)) {
        result = result.filter(e => new Date(e.startTime).getTime() >= fromTime)
      }
    }
    if (filter.dateTo) {
      const suffix = filter.dateTo.includes('T') ? '' : 'T23:59:59.999'
      const toTime = new Date(filter.dateTo + suffix).getTime()
      if (!isNaN(toTime)) {
        result = result.filter(e => new Date(e.startTime).getTime() <= toTime)
      }
    }

    return result
  }

  function getStats(): HistoryStats {
    const list = entries.value
    const totalSessions = list.length
    const totalDuration = list.reduce((sum, e) => sum + (e.duration || 0), 0)
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0

    const vhostCounts: Record<string, number> = {}
    const appCounts: Record<string, number> = {}

    let mostActiveVHost = ''
    let maxVHostCount = 0
    let mostActiveApp = ''
    let maxAppCount = 0

    for (const e of list) {
      if (e.vhost) {
        vhostCounts[e.vhost] = (vhostCounts[e.vhost] || 0) + 1
        if (vhostCounts[e.vhost] > maxVHostCount) {
          maxVHostCount = vhostCounts[e.vhost]
          mostActiveVHost = e.vhost
        }
      }
      if (e.app) {
        appCounts[e.app] = (appCounts[e.app] || 0) + 1
        if (appCounts[e.app] > maxAppCount) {
          maxAppCount = appCounts[e.app]
          mostActiveApp = e.app
        }
      }
    }

    return {
      totalSessions,
      totalDuration,
      avgDuration,
      mostActiveVHost,
      mostActiveApp,
    }
  }

  async function pruneOldEntries(retentionDays: number): Promise<void> {
    error.value = null
    try {
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      const all = await new Promise<StreamHistoryEntry[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      let deletedAny = false
      for (const entry of all) {
        const entryTime = new Date(entry.startTime).getTime()
        if (!isNaN(entryTime) && entryTime < cutoffTime) {
          store.delete(entry.id)
          deletedAny = true
        }
      }

      if (deletedAny) {
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      }
      db.close()

      await refresh()
    } catch (err: any) {
      error.value = err.message || 'Failed to prune old stream history entries'
      console.error('pruneOldEntries error:', err)
      throw err
    }
  }

  onMounted(async () => {
    try {
      await refresh()
      await pruneOldEntries(30)
    } catch (err) {
      console.error('Failed to load or prune stream history on mount:', err)
    }
  })

  onUnmounted(() => {
    // No cleanup required for IndexedDB
  })

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    clearHistory,
    getFiltered,
    getStats,
    pruneOldEntries,
    refresh,
  }
}
