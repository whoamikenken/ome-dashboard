import { ref, onMounted, computed } from 'vue'

export interface NotificationEvent {
  id: string
  type: 'stream_start' | 'stream_stop' | 'recording_complete' | 'push_status_change' | 'connection_loss' | 'error'
  title: string
  message: string
  vhost?: string
  app?: string
  streamName?: string
  timestamp: string
  isRead: boolean
  isSoundEnabled: boolean
}

export interface NotificationPreferences {
  soundEnabled: boolean
  events: {
    stream_start: boolean
    stream_stop: boolean
    recording_complete: boolean
    push_status_change: boolean
    connection_loss: boolean
    error: boolean
  }
}

const DB_NAME = 'ome-dashboard'
const STORE_NAME = 'notifications'
const DB_VERSION = 2
const PREFS_KEY = 'ome_notification_preferences'

const defaultPreferences: NotificationPreferences = {
  soundEnabled: true,
  events: {
    stream_start: true,
    stream_stop: true,
    recording_complete: true,
    push_status_change: true,
    connection_loss: true,
    error: true,
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('stream-history')) {
        db.createObjectStore('stream-history', { keyPath: 'id', autoIncrement: false })
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Global/Shared state so different component instances share the same notifications and preferences
const notifications = ref<NotificationEvent[]>([])
const preferences = ref<NotificationPreferences>({ ...defaultPreferences })
const isLoading = ref(false)
const error = ref<string | null>(null)

export function useNotifications() {
  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

  function playSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch (err) {
      console.warn('Web Audio API is not supported or blocked by browser policy:', err)
    }
  }

  function loadPreferences(): void {
    try {
      const stored = localStorage.getItem(PREFS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        preferences.value = {
          soundEnabled: parsed.soundEnabled !== undefined ? parsed.soundEnabled : defaultPreferences.soundEnabled,
          events: {
            ...defaultPreferences.events,
            ...(parsed.events || {})
          }
        }
      } else {
        preferences.value = JSON.parse(JSON.stringify(defaultPreferences))
      }
    } catch (err) {
      console.error('Failed to load preferences from localStorage', err)
      preferences.value = JSON.parse(JSON.stringify(defaultPreferences))
    }
  }

  function updatePreferences(prefs: Partial<NotificationPreferences> | any): void {
    preferences.value = {
      ...preferences.value,
      ...prefs,
      events: {
        ...preferences.value.events,
        ...(prefs.events || {})
      }
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences.value))
    } catch (err) {
      console.error('Failed to save preferences to localStorage', err)
    }
  }

  async function refresh(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      const result = await new Promise<NotificationEvent[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      // Sort by timestamp desc
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      notifications.value = result
      db.close()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch notifications'
      console.error('refresh notifications error:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function addNotification(event: Omit<NotificationEvent, 'id' | 'timestamp' | 'isRead'>): Promise<string> {
    error.value = null
    try {
      const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString()

      const timestamp = new Date().toISOString()
      
      const isEventEnabled = preferences.value.events[event.type] !== false
      const soundPlayed = event.isSoundEnabled !== undefined 
        ? event.isSoundEnabled 
        : (preferences.value.soundEnabled && isEventEnabled)

      const newNotification: NotificationEvent = {
        ...event,
        id,
        timestamp,
        isRead: false,
        isSoundEnabled: soundPlayed
      }

      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.add(newNotification)

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      // Insert and keep sorted
      notifications.value = [newNotification, ...notifications.value].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      if (soundPlayed) {
        playSound()
      }

      return id
    } catch (err: any) {
      error.value = err.message || 'Failed to add notification'
      console.error('addNotification error:', err)
      throw err
    }
  }

  async function markAsRead(id: string): Promise<void> {
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      const existing = await new Promise<NotificationEvent | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!existing) {
        db.close()
        throw new Error(`Notification entry with ID ${id} not found`)
      }

      existing.isRead = true
      store.put(existing)

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()

      const index = notifications.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notifications.value[index].isRead = true
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to mark notification as read'
      console.error('markAsRead error:', err)
      throw err
    }
  }

  async function markAllAsRead(): Promise<void> {
    error.value = null
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      const all = await new Promise<NotificationEvent[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      let updatedAny = false
      for (const item of all) {
        if (!item.isRead) {
          item.isRead = true
          store.put(item)
          updatedAny = true
        }
      }

      if (updatedAny) {
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      }
      db.close()

      notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    } catch (err: any) {
      error.value = err.message || 'Failed to mark all notifications as read'
      console.error('markAllAsRead error:', err)
      throw err
    }
  }

  async function deleteNotification(id: string): Promise<void> {
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

      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete notification'
      console.error('deleteNotification error:', err)
      throw err
    }
  }

  async function clearAll(): Promise<void> {
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

      notifications.value = []
    } catch (err: any) {
      error.value = err.message || 'Failed to clear all notifications'
      console.error('clearAll error:', err)
      throw err
    }
  }

  function getUnread(): NotificationEvent[] {
    return notifications.value.filter(n => !n.isRead)
  }

  onMounted(() => {
    // Only load if not already loaded
    loadPreferences()
    refresh()
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh,
    getUnread,
    playSound,
    preferences,
    updatePreferences,
    loadPreferences
  }
}
