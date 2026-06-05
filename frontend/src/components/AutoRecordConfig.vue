<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAutoRecord } from '@/composables/useAutoRecord'
import {
  HardDrive,
  Circle,
  Square,
  Save,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  CalendarDays
} from 'lucide-vue-next'

const props = defineProps<{
  vhost: string
  app: string
  streamName: string
}>()

const emit = defineEmits<{
  (e: 'stateChange'): void
}>()

const {
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
  checkStatus,
  saveConfig
} = useAutoRecord()

const localEnabled = ref(false)
const localSchedule = ref({
  enabled: false,
  days: [] as number[],
  startTime: '00:00',
  endTime: '23:59'
})
const localStorageConf = ref({
  format: 'ts' as 'ts' | 'mp4',
  path: '',
  retentionDays: 30
})

const localError = ref<string | null>(null)
const localSuccess = ref(false)
const manualLoading = ref(false)

const weekdays = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 }
]

function syncFromStore() {
  localEnabled.value = autoRecordEnabled.value
  localSchedule.value = {
    enabled: scheduleConfig.value.enabled,
    days: [...scheduleConfig.value.days],
    startTime: scheduleConfig.value.startTime,
    endTime: scheduleConfig.value.endTime
  }
  localStorageConf.value = {
    format: storageConfig.value.format,
    path: storageConfig.value.path,
    retentionDays: storageConfig.value.retentionDays
  }
}

onMounted(async () => {
  syncFromStore()
  await handleRefreshStatus()
})

watch([autoRecordEnabled, scheduleConfig, storageConfig], () => {
  syncFromStore()
}, { deep: true })

function toggleDay(val: number) {
  const index = localSchedule.value.days.indexOf(val)
  if (index === -1) {
    localSchedule.value.days.push(val)
  } else {
    localSchedule.value.days.splice(index, 1)
  }
}

async function handleRefreshStatus() {
  await checkStatus(props.vhost, props.app, props.streamName)
}

async function handleStartNow() {
  localError.value = null
  manualLoading.value = true
  try {
    await startNow(props.vhost, props.app, props.streamName)
    emit('stateChange')
  } catch (err: any) {
    localError.value = err.message || 'Failed to start manual recording'
  } finally {
    manualLoading.value = false
  }
}

async function handleStopNow() {
  localError.value = null
  manualLoading.value = true
  try {
    await stopNow(props.vhost, props.app, props.streamName)
    emit('stateChange')
  } catch (err: any) {
    localError.value = err.message || 'Failed to stop manual recording'
  } finally {
    manualLoading.value = false
  }
}

async function handleSave() {
  localError.value = null
  localSuccess.value = false

  if (localEnabled.value) {
    if (!localStorageConf.value.path.trim()) {
      localError.value = 'File path template is required'
      return
    }
    if (localStorageConf.value.retentionDays < 1 || localStorageConf.value.retentionDays > 365) {
      localError.value = 'Retention days must be between 1 and 365'
      return
    }
    if (localSchedule.value.enabled) {
      if (localSchedule.value.days.length === 0) {
        localError.value = 'Please select at least one day for the schedule'
        return
      }
      if (!localSchedule.value.startTime || !localSchedule.value.endTime) {
        localError.value = 'Start time and end time are required'
        return
      }
    }
  }

  try {
    if (autoRecordEnabled.value !== localEnabled.value) {
      await toggleAutoRecord()
    }
    setSchedule(localSchedule.value)
    setStorage(localStorageConf.value)
    saveConfig()

    localSuccess.value = true
    setTimeout(() => {
      localSuccess.value = false
    }, 3000)

    emit('stateChange')
  } catch (err: any) {
    localError.value = err.message || 'Failed to save configuration'
  }
}
</script>

<template>
  <div class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
    <!-- Header with Switch -->
    <div class="flex items-center justify-between mb-4 pb-4 border-b border-subtle">
      <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground">
        <HardDrive class="w-4 h-4 text-primary" />
        <span>Auto Recording</span>
      </h3>
      <button
        type="button"
        @click="localEnabled = !localEnabled"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
        :class="localEnabled ? 'bg-primary' : 'bg-subtle'"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="localEnabled ? 'translate-x-5' : 'translate-x-0'"
        ></span>
      </button>
    </div>

    <!-- Error block -->
    <div v-if="localError || error" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger flex items-start space-x-2">
      <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{{ localError || error }}</span>
    </div>

    <!-- Configuration Body -->
    <div v-if="localEnabled" class="space-y-4">
      <!-- Storage Format Selector -->
      <div>
        <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Storage Format</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="localStorageConf.format = 'ts'"
            class="px-3 py-2 text-sm font-medium rounded-lg border text-center transition-colors cursor-pointer"
            :class="localStorageConf.format === 'ts'
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-muted border-subtle text-foreground hover:bg-muted/80'"
          >
            TS
          </button>
          <button
            type="button"
            @click="localStorageConf.format = 'mp4'"
            class="px-3 py-2 text-sm font-medium rounded-lg border text-center transition-colors cursor-pointer"
            :class="localStorageConf.format === 'mp4'
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-muted border-subtle text-foreground hover:bg-muted/80'"
          >
            MP4
          </button>
        </div>
      </div>

      <!-- File Path Template -->
      <div>
        <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">File Path Template</label>
        <input
          v-model="localStorageConf.path"
          type="text"
          placeholder="/recordings/{vhost}/{app}/{stream}_{date}"
          class="w-full px-3 py-2 bg-background border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
        />
        <p class="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          Placeholders: <code class="bg-muted px-1 py-0.5 rounded text-primary">{vhost}</code>, 
          <code class="bg-muted px-1 py-0.5 rounded text-primary">{app}</code>, 
          <code class="bg-muted px-1 py-0.5 rounded text-primary">{stream}</code>, 
          <code class="bg-muted px-1 py-0.5 rounded text-primary">{date}</code>
        </p>
      </div>

      <!-- Retention Days -->
      <div>
        <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Retention Days (1-365)</label>
        <input
          v-model.number="localStorageConf.retentionDays"
          type="number"
          min="1"
          max="365"
          class="w-full px-3 py-2 bg-background border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <!-- Schedule Section -->
      <div class="border-t border-subtle pt-4 mt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-1.5">
            <CalendarDays class="w-3.5 h-3.5 text-primary" />
            <span>Recording Schedule</span>
          </h4>
          <button
            type="button"
            @click="localSchedule.enabled = !localSchedule.enabled"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="localSchedule.enabled ? 'bg-primary' : 'bg-subtle'"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="localSchedule.enabled ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <div v-if="localSchedule.enabled" class="space-y-3 mt-3">
          <div>
            <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Days of Week</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="day in weekdays"
                :key="day.value"
                type="button"
                @click="toggleDay(day.value)"
                class="w-10 h-10 rounded-full border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer select-none"
                :class="localSchedule.days.includes(day.value)
                  ? 'bg-primary border-primary text-white font-bold'
                  : 'bg-muted border-subtle text-muted-foreground hover:bg-muted/80'"
              >
                {{ day.label }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Start Time</label>
              <input
                v-model="localSchedule.startTime"
                type="time"
                class="w-full px-3 py-2 bg-background border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">End Time</label>
              <input
                v-model="localSchedule.endTime"
                type="time"
                class="w-full px-3 py-2 bg-background border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Current status and override button -->
      <div class="border-t border-subtle pt-4 mt-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-foreground uppercase tracking-wider">Recording Status</span>
          <div class="flex items-center space-x-2">
            <button
              type="button"
              @click="handleRefreshStatus"
              :disabled="isLoading || manualLoading"
              class="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer mr-1"
              title="Refresh status"
            >
              <RefreshCw class="w-3.5 h-3.5 text-muted-foreground" :class="{ 'animate-spin': isLoading }" />
            </button>
            <div
              :class="isRecording ? 'bg-success animate-pulse' : 'bg-muted-foreground/40'"
              class="w-2.5 h-2.5 rounded-full"
            ></div>
            <span class="text-sm font-semibold" :class="isRecording ? 'text-success' : 'text-muted-foreground'">
              {{ isRecording ? 'Recording in progress' : 'Not recording' }}
            </span>
          </div>
        </div>

        <button
          v-if="!isRecording"
          type="button"
          @click="handleStartNow"
          :disabled="isLoading || manualLoading"
          class="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Loader2 v-if="manualLoading" class="w-4 h-4 animate-spin" />
          <Circle v-else class="w-4 h-4" />
          <span>Start Recording Now</span>
        </button>
        <button
          v-else
          type="button"
          @click="handleStopNow"
          :disabled="isLoading || manualLoading"
          class="w-full px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Loader2 v-if="manualLoading" class="w-4 h-4 animate-spin" />
          <Square v-else class="w-4 h-4" />
          <span>Stop Recording Now</span>
        </button>
      </div>
    </div>

    <!-- Save button at the bottom -->
    <div class="mt-5 pt-4 border-t border-subtle flex items-center justify-between">
      <div class="flex items-center space-x-1.5 text-xs">
        <transition name="fade">
          <span v-if="localSuccess" class="text-success flex items-center space-x-1 font-medium">
            <Check class="w-4 h-4" />
            <span>Config Saved!</span>
          </span>
        </transition>
      </div>
      <button
        type="button"
        @click="handleSave"
        :disabled="isLoading || manualLoading"
        class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Loader2 v-if="isLoading && !manualLoading" class="w-4 h-4 animate-spin" />
        <Save v-else class="w-4 h-4" />
        <span>Save Config</span>
      </button>
    </div>
  </div>
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
