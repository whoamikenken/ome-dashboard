<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVHostStore } from '@/stores/vhosts'
import { listApps, deleteApp } from '@/api/apps'
import AppCard from '@/components/AppCard.vue'
import AppForm from '@/components/AppForm.vue'
import {
  ArrowLeft,
  Plus,
  Server,
  Globe,
  Shield,
  Radio,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useVHostStore()

const vhostName = computed(() => route.params.vhost as string)
const vhost = computed(() => store.getVHostDetail(vhostName.value))

const apps = ref<string[]>([])
const appsLoading = ref(false)
const appsError = ref<string | null>(null)
const showCreateModal = ref(false)

async function fetchApps() {
  appsLoading.value = true
  appsError.value = null
  try {
    const res = await listApps(vhostName.value)
    apps.value = res.response || []
  } catch (err: any) {
    appsError.value = err.response?.data?.message || err.message || 'Failed to fetch applications'
  } finally {
    appsLoading.value = false
  }
}

async function confirmDeleteApp(appName: string) {
  if (confirm(`Delete application "${appName}"? This will restart the application.`)) {
    try {
      await deleteApp(vhostName.value, appName)
      apps.value = apps.value.filter(a => a !== appName)
    } catch (err: any) {
      appsError.value = err.response?.data?.message || err.message || 'Failed to delete application'
    }
  }
}

async function handleDeleteVHost() {
  if (confirm(`Are you sure you want to delete virtual host "${vhostName.value}"?`)) {
    const success = await store.removeVHost(vhostName.value)
    if (success) {
      router.push({ name: 'vhosts' })
    }
  }
}

function viewApp(appName: string) {
  router.push({ name: 'app-detail', params: { vhost: vhostName.value, app: appName } })
}

function goBack() {
  router.push({ name: 'vhosts' })
}

function handleAppCreated() {
  showCreateModal.value = false
  fetchApps()
}

// Get enabled provider names from the vhost's apps or from the vhost itself
function getEnabledProviders(): string[] {
  // Just return a reasonable default based on what's configured
  return ['rtmp', 'srt', 'webrtc', 'hls', 'llhls']
}

onMounted(() => {
  if (!vhost.value) {
    store.fetchVHosts().then(() => {
      fetchApps()
    })
  } else {
    fetchApps()
  }
})

// Re-fetch when vhost param changes
watch(vhostName, () => {
  fetchApps()
})
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
        <span>Back to Virtual Hosts</span>
      </button>
    </div>

    <!-- VHost Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card rounded-2xl border border-subtle p-6">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Server class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-foreground">
            {{ vhostName }}
          </h1>
          <div v-if="vhost?.host?.[0]?.names" class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="hn in vhost.host[0].names"
              :key="hn"
              class="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-medium"
            >
              {{ hn }}
            </span>
          </div>
        </div>
      </div>
      <div>
        <button
          @click="handleDeleteVHost"
          class="px-4 py-2 border border-danger/30 hover:border-danger bg-danger/10 hover:bg-danger/20 text-danger rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Trash2 class="w-4 h-4" />
          <span>Delete VHost</span>
        </button>
      </div>
    </div>

    <!-- VHost Configuration Details Grid -->
    <div>
      <h2 class="text-lg font-bold text-foreground mb-4">Configuration</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Host Names Section -->
        <div class="bg-card rounded-xl border border-subtle p-6">
          <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
            <Globe class="w-4 h-4 text-primary" />
            <span>Host Names</span>
          </h3>
          <div v-if="vhost?.host?.[0]?.names?.length" class="space-y-2">
            <div v-for="(hn, idx) in vhost.host[0].names" :key="hn" class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Host Name {{ idx + 1 }}</span>
              <span class="text-sm text-foreground font-medium select-all">{{ hn }}</span>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Not configured</div>
        </div>

        <!-- TLS Section -->
        <div class="bg-card rounded-xl border border-subtle p-6">
          <h3 class="flex items-center justify-between text-sm font-semibold text-foreground mb-4">
            <div class="flex items-center space-x-2">
              <Shield class="w-4 h-4 text-primary" />
              <span>TLS Configuration</span>
            </div>
            <div v-if="vhost?.host?.[0]?.tls" class="flex items-center space-x-1 px-2.5 py-0.5 bg-success/10 text-success rounded-full text-xs font-semibold">
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>TLS Enabled</span>
            </div>
            <div v-else class="flex items-center space-x-1 px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold">
              <XCircle class="w-3.5 h-3.5" />
              <span>No TLS</span>
            </div>
          </h3>
          <div v-if="vhost?.host?.[0]?.tls" class="space-y-2">
            <div class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Certificate Path</span>
              <span class="text-sm text-foreground font-medium select-all truncate max-w-[200px]" :title="vhost.host[0].tls.certPath">
                {{ vhost.host[0].tls.certPath }}
              </span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Chain Certificate Path</span>
              <span class="text-sm text-foreground font-medium select-all truncate max-w-[200px]" :title="vhost.host[0].tls.chainCertPath">
                {{ vhost.host[0].tls.chainCertPath }}
              </span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Key Path</span>
              <span class="text-sm text-foreground font-medium select-all truncate max-w-[200px]" :title="vhost.host[0].tls.keyPath">
                {{ vhost.host[0].tls.keyPath }}
              </span>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Not configured</div>
        </div>

        <!-- Origins Section (if vhost.origins exists) -->
        <div v-if="vhost?.origins" class="bg-card rounded-xl border border-subtle p-6">
          <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
            <Globe class="w-4 h-4 text-primary" />
            <span>Origins</span>
          </h3>
          <div v-if="vhost.origins.origin?.length" class="space-y-4">
            <div v-for="(orig, idx) in vhost.origins.origin" :key="idx" class="border-b border-subtle last:border-b-0 pb-3 last:pb-0 space-y-2">
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Location</span>
                <span class="text-sm text-foreground font-medium">{{ orig.location }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Pass Schema</span>
                <span class="text-sm text-foreground font-medium uppercase">{{ orig.pass?.schema }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Pass URLs</span>
                <div class="flex flex-col items-end max-w-[200px] truncate">
                  <span v-for="url in orig.pass?.urls?.url" :key="url" class="text-sm text-foreground font-medium select-all" :title="url">{{ url }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Not configured</div>
        </div>

        <!-- Signed Policy Section (if signedPolicy exists) -->
        <div v-if="vhost?.signedPolicy" class="bg-card rounded-xl border border-subtle p-6">
          <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
            <Shield class="w-4 h-4 text-primary" />
            <span>Signed Policy</span>
          </h3>
          <div v-if="vhost.signedPolicy.policyQueryKeyName || vhost.signedPolicy.signatureQueryKeyName || vhost.signedPolicy.secretKey" class="space-y-2">
            <div v-if="vhost.signedPolicy.policyQueryKeyName" class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Query Key Name</span>
              <span class="text-sm text-foreground font-medium">{{ vhost.signedPolicy.policyQueryKeyName }}</span>
            </div>
            <div v-if="vhost.signedPolicy.signatureQueryKeyName" class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Signature Key Name</span>
              <span class="text-sm text-foreground font-medium">{{ vhost.signedPolicy.signatureQueryKeyName }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Secret Key</span>
              <span class="text-sm text-foreground font-medium">
                {{ vhost.signedPolicy.secretKey ? '••••••••' : 'Not Configured' }}
              </span>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Not configured</div>
        </div>

        <!-- Admission Webhooks Section (if admissionWebhooks exists) -->
        <div v-if="vhost?.admissionWebhooks" class="bg-card rounded-xl border border-subtle p-6">
          <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
            <Server class="w-4 h-4 text-primary" />
            <span>Admission Webhooks</span>
          </h3>
          <div v-if="vhost.admissionWebhooks.controlServerUrl || vhost.admissionWebhooks.timeout" class="space-y-2">
            <div v-if="vhost.admissionWebhooks.controlServerUrl" class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Control Server URL</span>
              <span class="text-sm text-foreground font-medium select-all truncate max-w-[200px]" :title="vhost.admissionWebhooks.controlServerUrl">
                {{ vhost.admissionWebhooks.controlServerUrl }}
              </span>
            </div>
            <div v-if="vhost.admissionWebhooks.timeout" class="flex justify-between py-1">
              <span class="text-sm text-muted-foreground">Timeout</span>
              <span class="text-sm text-foreground font-medium">{{ vhost.admissionWebhooks.timeout }} ms</span>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Not configured</div>
        </div>
      </div>
    </div>

    <!-- Applications Section -->
    <div class="space-y-4">
      <!-- Section Header -->
      <div class="flex items-center justify-between border-b border-subtle pb-4">
        <div class="flex items-center space-x-2">
          <h2 class="text-xl font-bold text-foreground">Applications</h2>
          <span
            v-if="!appsLoading && !appsError"
            class="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold"
          >
            {{ apps.length }}
          </span>
        </div>
        <div class="flex items-center space-x-3">
          <button
            @click="fetchApps"
            class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': appsLoading }" />
          </button>
          <button
            @click="showCreateModal = true"
            class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>Create App</span>
          </button>
        </div>
      </div>

      <!-- Error Banner -->
      <div
        v-if="appsError"
        class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
      >
        <div class="flex items-center space-x-3">
          <AlertCircle class="w-5 h-5 text-danger" />
          <span class="text-sm font-medium text-danger">{{ appsError }}</span>
        </div>
        <button
          @click="fetchApps"
          class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
        >
          Retry
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="appsLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-card rounded-xl border border-subtle p-6 h-[178px] flex flex-col justify-between"
        >
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-lg animate-skeleton"></div>
              <div class="space-y-2 flex-1">
                <div class="h-4 animate-skeleton rounded w-2/3"></div>
                <div class="h-3 animate-skeleton rounded w-1/3"></div>
              </div>
            </div>
            <div class="flex gap-2">
              <div class="h-6 animate-skeleton rounded w-16"></div>
              <div class="h-6 animate-skeleton rounded w-16"></div>
            </div>
          </div>
          <div class="flex items-center justify-between pt-4 border-t border-subtle">
            <div class="h-3 animate-skeleton rounded w-24"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="apps.length === 0"
        class="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-subtle text-center"
      >
        <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
          <Radio class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-1">No applications found</h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          Create your first application in this virtual host to get started.
        </p>
        <button
          @click="showCreateModal = true"
          class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Create App</span>
        </button>
      </div>

      <!-- App Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AppCard
          v-for="appName in apps"
          :key="appName"
          :name="appName"
          :type="'live'"
          :providers="getEnabledProviders()"
          @click="viewApp(appName)"
          @delete="confirmDeleteApp(appName)"
        />
      </div>
    </div>

    <!-- AppForm Modal -->
    <AppForm
      :show="showCreateModal"
      :vhostName="vhostName"
      @close="showCreateModal = false"
      @created="handleAppCreated"
    />
  </div>
</template>
