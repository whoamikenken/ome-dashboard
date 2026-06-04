<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApp, deleteApp } from '@/api/apps'
import { listStreams, deleteStream, pullStream } from '@/api/streams'
import type { Application } from '@/types/ome'
import StreamTable from '@/components/StreamTable.vue'
import OutputProfileList from '@/components/OutputProfileList.vue'
import PushControls from '@/components/PushControls.vue'
import RecordControls from '@/components/RecordControls.vue'
import {
  ArrowLeft,
  Plus,
  Radio,
  RefreshCw,
  AlertCircle,
  Trash2,
  Activity,
  Wifi,
  X,
  Loader2
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const vhostName = computed(() => route.params.vhost as string)
const appName = computed(() => route.params.app as string)

const app = ref<Application | null>(null)
const appLoading = ref(true)
const appError = ref<string | null>(null)

const streams = ref<string[]>([])
const streamsLoading = ref(true)

const selectedStream = ref<string | null>(null)
const showPullForm = ref(false)
const pullUrl = ref('')
const isPullingStream = ref(false)
const pullError = ref<string | null>(null)

onMounted(() => {
  fetchApp()
  fetchStreams()
})

async function fetchApp() {
  appLoading.value = true
  appError.value = null
  try {
    const res = await getApp(vhostName.value, appName.value)
    app.value = res.response || null
  } catch (err: any) {
    appError.value = err.response?.data?.message || err.message || 'Failed to fetch application'
  } finally {
    appLoading.value = false
  }
}

async function fetchStreams() {
  streamsLoading.value = true
  try {
    const res = await listStreams(vhostName.value, appName.value)
    streams.value = res.response || []
  } catch { /* ignore */ }
  finally { streamsLoading.value = false }
}

function goBack() {
  router.push({ name: 'vhost-detail', params: { vhost: vhostName.value } })
}

async function confirmDeleteApp() {
  if (confirm(`Delete application "${appName.value}"? This will restart the application.`)) {
    try {
      await deleteApp(vhostName.value, appName.value)
      router.push({ name: 'vhost-detail', params: { vhost: vhostName.value } })
    } catch (err: any) {
      appError.value = err.response?.data?.message || err.message || 'Failed to delete application'
    }
  }
}

async function confirmDeleteStream(name: string) {
  if (confirm(`Delete stream "${name}"? This terminates the ingress connection.`)) {
    try {
      await deleteStream(vhostName.value, appName.value, name)
      if (selectedStream.value === name) {
        selectedStream.value = null
      }
      await fetchStreams()
    } catch (err: any) {
      appError.value = err.response?.data?.message || err.message || 'Failed to delete stream'
    }
  }
}

async function handlePullStream() {
  if (!pullUrl.value.trim()) return
  isPullingStream.value = true
  pullError.value = null
  try {
    let streamName = 'pull_' + Date.now()
    try {
      const urlObj = new URL(pullUrl.value)
      const pathname = urlObj.pathname
      const parts = pathname.split('/')
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.trim() !== '') {
        streamName = lastPart
      }
    } catch {
      const parts = pullUrl.value.split('/')
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.trim() !== '') {
        streamName = lastPart
      }
    }

    await pullStream(vhostName.value, appName.value, {
      name: streamName,
      urls: [pullUrl.value]
    })
    pullUrl.value = ''
    showPullForm.value = false
    await fetchStreams()
  } catch (err: any) {
    pullError.value = err.response?.data?.message || err.message || 'Failed to pull stream'
  } finally {
    isPullingStream.value = false
  }
}

function getProviderNames(): string[] {
  if (!app.value?.providers) return []
  return Object.entries(app.value.providers)
    .filter(([_, val]) => val !== undefined && val !== null)
    .map(([key]) => key)
}

function getPublisherNames(): string[] {
  if (!app.value?.publishers) return []
  return Object.keys(app.value.publishers)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back Navigation -->
    <div>
      <button
        @click="goBack"
        class="inline-flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Back to {{ vhostName }}</span>
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="appError"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger" />
        <span class="text-sm font-medium text-danger">{{ appError }}</span>
      </div>
      <button
        @click="fetchApp"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="appLoading" class="space-y-6">
      <div class="bg-card rounded-2xl border border-subtle p-6 h-24 flex items-center justify-between">
        <div class="flex items-center space-x-4 w-full">
          <div class="w-12 h-12 rounded-xl animate-skeleton bg-muted"></div>
          <div class="space-y-2 flex-1">
            <div class="h-5 animate-skeleton rounded bg-muted w-1/4"></div>
            <div class="h-3 animate-skeleton rounded bg-muted w-1/12"></div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="space-y-6">
          <div class="bg-card rounded-xl border border-subtle p-6 h-32 animate-skeleton bg-muted"></div>
          <div class="bg-card rounded-xl border border-subtle p-6 h-32 animate-skeleton bg-muted"></div>
        </div>
        <div class="bg-card rounded-xl border border-subtle p-6 h-[280px] animate-skeleton bg-muted"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="app" class="space-y-6">
      <!-- App Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card rounded-2xl border border-subtle p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Radio class="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
              {{ appName }}
            </h1>
            <span class="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-semibold uppercase mt-1 inline-block">
              {{ app.type }}
            </span>
          </div>
        </div>
        <div>
          <button
            @click="confirmDeleteApp"
            class="px-4 py-2 border border-danger/30 hover:border-danger bg-danger/10 hover:bg-danger/20 text-danger rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Trash2 class="w-4 h-4" />
            <span>Delete App</span>
          </button>
        </div>
      </div>

      <!-- App Config section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="space-y-6">
          <!-- Providers Card -->
          <div class="bg-card rounded-xl border border-subtle p-6">
            <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
              <Wifi class="w-4 h-4 text-primary" />
              <span>Providers</span>
            </h3>
            <div v-if="getProviderNames().length" class="flex flex-wrap gap-2">
              <span
                v-for="prov in getProviderNames()"
                :key="prov"
                class="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold uppercase flex items-center space-x-1"
              >
                <Wifi class="w-3 h-3" />
                <span>{{ prov }}</span>
              </span>
            </div>
            <div v-else class="text-sm text-muted-foreground">
              No providers configured
            </div>
          </div>

          <!-- Publishers Card -->
          <div class="bg-card rounded-xl border border-subtle p-6">
            <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
              <Activity class="w-4 h-4 text-primary" />
              <span>Publishers</span>
            </h3>
            <div v-if="getPublisherNames().length" class="flex flex-wrap gap-2">
              <span
                v-for="pub in getPublisherNames()"
                :key="pub"
                class="px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-full text-xs font-semibold uppercase flex items-center space-x-1"
              >
                <Activity class="w-3 h-3" />
                <span>{{ pub }}</span>
              </span>
            </div>
            <div v-else class="text-sm text-muted-foreground">
              No publishers configured
            </div>
          </div>
        </div>

        <!-- Output Profiles Card -->
        <div>
          <OutputProfileList :profiles="app.outputProfiles || []" />
        </div>
      </div>

      <!-- Streams section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-subtle pb-4">
          <div class="flex items-center space-x-2">
            <h2 class="text-xl font-bold text-foreground">Streams</h2>
            <span
              v-if="!streamsLoading"
              class="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold"
            >
              {{ streams.length }}
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="showPullForm = !showPullForm"
              class="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Pull Stream from URL</span>
            </button>
            <button
              @click="fetchStreams"
              class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh streams"
            >
              <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': streamsLoading }" />
            </button>
          </div>
        </div>

        <!-- Pull stream form (collapsible) -->
        <transition name="fade">
          <div v-if="showPullForm" class="bg-card rounded-xl border border-subtle p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-foreground">Pull Stream from URL</h3>
              <button
                @click="showPullForm = false"
                class="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <form @submit.prevent="handlePullStream" class="space-y-4">
              <div v-if="pullError" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                {{ pullError }}
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Source URL *</label>
                <input
                  v-model="pullUrl"
                  placeholder="rtsp://source-server-ip:port/app/stream or rtmp://..."
                  class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                  required
                />
              </div>
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="showPullForm = false"
                  class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isPullingStream || !pullUrl.trim()"
                  class="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Loader2 v-if="isPullingStream" class="w-4 h-4 animate-spin" />
                  <span>{{ isPullingStream ? 'Pulling...' : 'Pull Stream' }}</span>
                </button>
              </div>
            </form>
          </div>
        </transition>

        <!-- Stream Table -->
        <StreamTable
          :streams="streams"
          :vhost="vhostName"
          :app="appName"
          :loading="streamsLoading"
          @view="name => selectedStream = name"
          @delete="confirmDeleteStream"
        />
      </div>

      <!-- Selected stream controls -->
      <transition name="fade">
        <div v-if="selectedStream" class="bg-card rounded-xl border border-subtle p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-subtle pb-4">
            <div class="flex items-center space-x-2">
              <Activity class="w-5 h-5 text-primary animate-pulse" />
              <h3 class="text-lg font-bold text-foreground">Controls: {{ selectedStream }}</h3>
            </div>
            <button
              @click="selectedStream = null"
              class="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              title="Close controls"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PushControls :vhost="vhostName" :app="appName" :streamName="selectedStream" />
            <RecordControls :vhost="vhostName" :app="appName" :streamName="selectedStream" />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
