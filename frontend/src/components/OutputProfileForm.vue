<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Check, AlertCircle, Save, RefreshCw } from 'lucide-vue-next'
import { getApp, updateApp } from '@/api/apps'
import ABRLadderEditor from './ABRLadderEditor.vue'
import type { OutputProfile, Application } from '@/types/ome'

const props = defineProps<{
  vhost: string
  app: string
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const profileName = ref('abr')
const streamPattern = ref('${streamName}_abr')
const profiles = ref<OutputProfile[]>([])

const loading = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Reset form fields
function resetForm() {
  profileName.value = 'abr'
  streamPattern.value = '${streamName}_abr'
  profiles.value = []
  error.value = null
  success.value = false
  isSubmitting.value = false
}

// Fetch existing application settings and initialize
async function loadAppConfig() {
  loading.value = true
  error.value = null
  success.value = false
  try {
    const appData = await getApp(props.vhost, props.app)
    const existing = appData.response?.outputProfiles || []

    if (existing.length > 0) {
      profiles.value = JSON.parse(JSON.stringify(existing))

      // Extract profileName and streamPattern from the first profile if possible
      const first = existing[0]
      const nameParts = first.name.split('_')
      if (nameParts.length > 1) {
        profileName.value = nameParts.slice(0, -1).join('_')
      } else {
        profileName.value = first.name
      }

      const streamParts = first.outputStreamName.split('_')
      if (streamParts.length > 1) {
        streamPattern.value = streamParts.slice(0, -1).join('_')
      } else {
        streamPattern.value = first.outputStreamName
      }
    } else {
      // Setup default configuration
      profileName.value = 'abr'
      streamPattern.value = '${streamName}_abr'
      profiles.value = [
        {
          name: 'abr_720p',
          outputStreamName: '${streamName}_abr_720p',
          encodes: [
            {
              name: 'abr_720p_v',
              type: 'video',
              codec: 'h264',
              bitrate: '2500k',
              width: 1280,
              height: 720,
              framerate: 30
            },
            {
              name: 'abr_720p_a',
              type: 'audio',
              codec: 'aac',
              bitrate: '128k',
              sampleRate: 48000,
              channel: 2
            }
          ]
        }
      ]
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to fetch application configuration'
  } finally {
    loading.value = false
  }
}

// Watchers to propagate base fields down to profiles
watch([profileName, streamPattern], () => {
  if (profiles.value.length === 0) return

  profiles.value = profiles.value.map(profile => {
    const nameParts = profile.name.split('_')
    const suffix = nameParts.length > 1 ? nameParts[nameParts.length - 1] : profile.name
    const newName = `${profileName.value.trim()}_${suffix}`

    const streamParts = profile.outputStreamName.split('_')
    const streamSuffix = streamParts.length > 1 ? streamParts[streamParts.length - 1] : profile.outputStreamName
    const newStreamName = `${streamPattern.value.trim()}_${streamSuffix}`

    const encodes = (profile.encodes || []).map(enc => {
      const typeSuffix = enc.type === 'video' ? 'v' : 'a'
      return {
        ...enc,
        name: `${newName}_${typeSuffix}`
      }
    })

    return {
      ...profile,
      name: newName,
      outputStreamName: newStreamName,
      encodes
    }
  })
})

// Triggered when children update
function handleProfilesUpdate(newProfiles: OutputProfile[]) {
  profiles.value = newProfiles.map(p => {
    const prefix = `${profileName.value.trim()}_`
    const hasPrefix = p.name.startsWith(prefix)

    let suffix = p.name
    if (hasPrefix) {
      suffix = p.name.substring(prefix.length)
    } else {
      const idx = p.name.indexOf('_')
      if (idx !== -1) {
        suffix = p.name.substring(idx + 1)
      }
    }

    const newName = `${profileName.value.trim()}_${suffix}`
    const newStreamName = `${streamPattern.value.trim()}_${suffix}`

    const encodes = (p.encodes || []).map(enc => {
      const typeSuffix = enc.type === 'video' ? 'v' : 'a'
      return {
        ...enc,
        name: `${newName}_${typeSuffix}`
      }
    })

    return {
      ...p,
      name: newName,
      outputStreamName: newStreamName,
      encodes
    }
  })
}

// Handle dialog visibility
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadAppConfig()
  } else {
    resetForm()
  }
})

// Form Validation
const isFormValid = computed(() => {
  if (!profileName.value.trim()) return false
  if (!streamPattern.value.trim()) return false
  if (profiles.value.length === 0) return false

  const names = new Set<string>()
  for (const p of profiles.value) {
    const trimmed = p.name.trim()
    if (!trimmed) return false
    if (names.has(trimmed)) return false
    names.add(trimmed)

    const video = p.encodes?.find(e => e.type === 'video')
    const audio = p.encodes?.find(e => e.type === 'audio')

    if (!video || !audio) return false

    const parseBitrate = (val: any): number => {
      if (typeof val === 'number') return Math.floor(val / 1000)
      if (typeof val === 'string') {
        const lower = val.toLowerCase()
        if (lower.endsWith('k')) return parseInt(lower) || 0
        if (lower.endsWith('m')) return (parseInt(lower) || 0) * 1000
        return Math.floor((parseInt(lower) || 0) / 1000)
      }
      return 0
    }

    const vBitrate = parseBitrate(video.bitrate)
    const aBitrate = parseBitrate(audio.bitrate)

    if (vBitrate < 100 || vBitrate > 20000) return false
    if (aBitrate < 32 || aBitrate > 512) return false

    if (Number(video.width) <= 0 || Number(video.height) <= 0) return false
  }

  return true
})

// Submit update configuration
async function handleSave() {
  if (!isFormValid.value) return

  isSubmitting.value = true
  error.value = null
  success.value = false

  try {
    // 1. Fetch current application config to keep other configurations intact
    const appData = await getApp(props.vhost, props.app)
    const currentApp = appData.response

    // 2. Build the full payload with updated outputProfiles
    const payload: Application = {
      ...currentApp,
      outputProfiles: profiles.value
    }

    // 3. Update application configuration
    await updateApp(props.vhost, props.app, payload)

    success.value = true
    setTimeout(() => {
      emit('saved')
      emit('close')
    }, 1500)
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to update output profiles'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
        <!-- Backdrop -->
        <div class="fixed inset-0 cursor-default" @click="emit('close')"></div>

        <!-- Modal Box -->
        <div class="bg-card rounded-2xl border border-subtle shadow-2xl w-full max-w-3xl z-10 flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-subtle">
            <div>
              <h2 class="text-lg font-bold text-foreground">Configure ABR Output Profiles</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                VHost: <span class="font-semibold text-foreground mr-3">{{ vhost }}</span>
                App: <span class="font-semibold text-foreground">{{ app }}</span>
              </p>
            </div>
            <button @click="emit('close')" class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body (Scrollable content) -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <!-- Loading indicator for initial app fetch -->
            <div v-if="loading" class="space-y-4 py-6">
              <div class="h-10 bg-muted rounded animate-skeleton"></div>
              <div class="h-10 bg-muted rounded animate-skeleton"></div>
              <div class="h-48 bg-muted rounded animate-skeleton"></div>
            </div>

            <!-- Editor Form Content -->
            <div v-else class="space-y-5">
              <!-- Success Alert Banner -->
              <div v-if="success" class="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success flex items-center space-x-2">
                <Check class="w-4 h-4 flex-shrink-0" />
                <span>Output profiles saved successfully! Closing editor...</span>
              </div>

              <!-- Error Alert Banner -->
              <div v-if="error" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger flex items-center space-x-2">
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                <span>{{ error }}</span>
              </div>

              <!-- Base Inputs -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile Base Name *</label>
                  <input
                    v-model="profileName"
                    type="text"
                    placeholder="e.g. live"
                    class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                  />
                  <p class="text-[10px] text-muted-foreground">
                    Prefix for rendition names (e.g. <span class="font-mono text-foreground">{{ profileName }}_720p</span>)
                  </p>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Stream Name Pattern *</label>
                  <input
                    v-model="streamPattern"
                    type="text"
                    placeholder="e.g. ${streamName}_live"
                    class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 font-mono"
                  />
                  <p class="text-[10px] text-muted-foreground">
                    Must include the <span class="font-semibold text-foreground font-mono">${streamName}</span> placeholder.
                  </p>
                </div>
              </div>

              <!-- ABRLadderEditor component -->
              <div class="border border-subtle bg-muted/5 rounded-xl p-4">
                <ABRLadderEditor
                  :modelValue="profiles"
                  @update:modelValue="handleProfilesUpdate"
                  :loading="loading"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center space-x-3 p-4 border-t border-subtle bg-muted/10">
            <button
              type="button"
              @click="emit('close')"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSave"
              :disabled="isSubmitting || !isFormValid || loading"
              class="flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              <Save v-if="!isSubmitting" class="w-4 h-4" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? 'Saving...' : 'Save Profiles' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
