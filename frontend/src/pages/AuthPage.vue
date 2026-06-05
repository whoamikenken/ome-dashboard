<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePublishAuth } from '@/composables/usePublishAuth'
import { listVHosts } from '@/api/vhosts'
import { listApps } from '@/api/apps'
import type { PublishToken, AuthConfig } from '@/types/auth'
import PublishTokenForm from '@/components/PublishTokenForm.vue'
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Eye,
  EyeOff,
  Server,
  Radio,
  Activity,
  ArrowUpDown
} from 'lucide-vue-next'

const {
  tokens,
  isLoading: isAuthLoading,
  error: authError,
  revokeToken,
  deleteToken,
  refresh: refreshTokens,
  copyToClipboard,
  getStats,
  fetchAuthConfig,
  pruneExpired
} = usePublishAuth()

// Tab State
const activeTab = ref<'tokens' | 'config'>('tokens')

// Lists
const vhosts = ref<string[]>([])
const isPageLoading = ref(false)
const pageError = ref<string | null>(null)

// Tokens Tab Filters & Sorting
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'revoked'>('all')
const sortField = ref<keyof PublishToken>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')

// Token UI State
const visibleTokens = ref<Record<string, boolean>>({})
const copiedTokenId = ref<string | null>(null)
const deleteConfirmId = ref<string | null>(null)

// Modal State
const showGenerateModal = ref(false)
const modalApps = ref<string[]>([])
const selectedModalVHost = ref('')
const selectedModalApp = ref('')

// Auth Config Tab State
const configVHost = ref('')
const configApp = ref('')
const configApps = ref<string[]>([])
const activeConfig = ref<AuthConfig | null>(null)
const isConfigLoading = ref(false)
const configError = ref<string | null>(null)

// Load VHosts and init page
async function loadVHosts() {
  isPageLoading.value = true
  pageError.value = null
  try {
    const res = await listVHosts()
    vhosts.value = res.response || []
    if (vhosts.value.length > 0) {
      if (!configVHost.value) {
        configVHost.value = vhosts.value[0]
      }
      selectedModalVHost.value = vhosts.value[0]
      await loadConfigApps()
    }
  } catch (err: any) {
    pageError.value = err.message || 'Failed to load virtual hosts'
  } finally {
    isPageLoading.value = false
  }
}

// Load Apps for Auth Config selector
async function loadConfigApps() {
  if (!configVHost.value) {
    configApps.value = []
    configApp.value = ''
    return
  }
  try {
    const res = await listApps(configVHost.value)
    configApps.value = res.response || []
    configApp.value = '' // Default to "All Apps"
    await loadAuthConfig()
  } catch (err) {
    console.error('Failed to load apps for config vhost', err)
    configApps.value = []
  }
}

// Fetch Auth Config (Signed Policy & Webhooks)
async function loadAuthConfig() {
  if (!configVHost.value) {
    activeConfig.value = null
    return
  }
  isConfigLoading.value = true
  configError.value = null
  try {
    const appParam = configApp.value === '' ? undefined : configApp.value
    const config = await fetchAuthConfig(configVHost.value, appParam)
    activeConfig.value = config
  } catch (err: any) {
    configError.value = err.message || 'Failed to fetch authentication configuration'
    activeConfig.value = null
  } finally {
    isConfigLoading.value = false
  }
}

// Handle VHost change in the Modal
async function handleModalVHostChange(vhost: string) {
  selectedModalVHost.value = vhost
  try {
    const res = await listApps(vhost)
    modalApps.value = res.response || []
    if (modalApps.value.length > 0) {
      selectedModalApp.value = modalApps.value[0]
    } else {
      selectedModalApp.value = ''
    }
  } catch (err) {
    console.error('Failed to load apps for modal vhost', err)
    modalApps.value = []
    selectedModalApp.value = ''
  }
}

// Global Refresh Action
async function handleRefresh() {
  if (activeTab.value === 'tokens') {
    await refreshTokens()
    await pruneExpired()
  } else {
    await loadVHosts()
  }
}

// Open Token Generator Modal
async function openGenerateModal() {
  if (vhosts.value.length === 0) {
    await loadVHosts()
  }
  if (vhosts.value.length > 0) {
    selectedModalVHost.value = vhosts.value[0]
    await handleModalVHostChange(selectedModalVHost.value)
    showGenerateModal.value = true
  } else {
    pageError.value = 'No virtual hosts available to generate tokens for.'
  }
}

// Copy unmasked token value
async function handleCopyToClipboard(token: PublishToken) {
  try {
    await copyToClipboard(token.token)
    copiedTokenId.value = token.id
    setTimeout(() => {
      copiedTokenId.value = null
    }, 2000)
  } catch (err) {
    console.error('Copy failed', err)
  }
}

// Revoke Token Handler
async function handleRevokeToken(id: string) {
  try {
    await revokeToken(id)
  } catch (err) {
    console.error('Revocation failed', err)
  }
}

// Delete Token request
function requestDeleteToken(id: string) {
  deleteConfirmId.value = id
}

async function confirmDeleteToken() {
  if (deleteConfirmId.value) {
    try {
      await deleteToken(deleteConfirmId.value)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      deleteConfirmId.value = null
    }
  }
}

// Toggle masking
function toggleTokenVisibility(id: string) {
  visibleTokens.value[id] = !visibleTokens.value[id]
}

// Clear Search Filters
function clearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

// Sort Handler
function toggleSort(field: keyof PublishToken) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function getSortIcon(field: keyof PublishToken): string {
  if (sortField.value !== field) return 'text-muted-foreground/30'
  return sortDir.value === 'asc' ? 'text-primary' : 'text-primary rotate-180'
}

// Date formatter helper
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Never'
  }
}

// Compute Stats Summary
const stats = computed(() => {
  return getStats()
})

// Filtered and Sorted Token List
const filteredTokens = computed(() => {
  let list = [...tokens.value]
  const now = Date.now()

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.vhost.toLowerCase().includes(q) ||
      t.app.toLowerCase().includes(q) ||
      t.streamName.toLowerCase().includes(q)
    )
  }

  // Status Filter
  if (statusFilter.value === 'active') {
    list = list.filter(t => !t.isRevoked && (!t.expiresAt || new Date(t.expiresAt).getTime() > now))
  } else if (statusFilter.value === 'revoked') {
    list = list.filter(t => t.isRevoked || (t.expiresAt && new Date(t.expiresAt).getTime() <= now))
  }

  // Sort list
  list.sort((a, b) => {
    const field = sortField.value
    const aVal = a[field]
    const bVal = b[field]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let cmp = 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal
    } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0)
    }

    return sortDir.value === 'asc' ? cmp : -cmp
  })

  return list
})

// Watch Auth Config tab selection updates
watch(configVHost, async () => {
  await loadConfigApps()
})

watch(configApp, async () => {
  await loadAuthConfig()
})

onMounted(async () => {
  await loadVHosts()
  await pruneExpired()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Publish Authentication</h1>
        <p class="text-sm text-muted-foreground mt-1">Manage publish access tokens and view auth configuration</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="handleRefresh"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': isAuthLoading || isConfigLoading || isPageLoading }" />
        </button>
        <button
          @click="openGenerateModal"
          class="inline-flex items-center space-x-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-sm"
          title="Generate Token"
        >
          <Plus class="w-4 h-4" />
          <span>Generate Token</span>
        </button>
      </div>
    </div>

    <!-- Stats Summary Bar -->
    <div v-if="isAuthLoading && tokens.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm animate-skeleton">
        <div class="p-3 bg-muted rounded-lg w-12 h-12"></div>
        <div class="space-y-2 flex-1">
          <div class="h-3 bg-muted rounded w-20"></div>
          <div class="h-5 bg-muted rounded w-32"></div>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Tokens -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-primary/10 text-primary rounded-lg">
          <Key class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Tokens</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.total }}</h3>
        </div>
      </div>

      <!-- Active Tokens -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-success/10 text-success rounded-lg">
          <ShieldCheck class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Tokens</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.active }}</h3>
        </div>
      </div>

      <!-- Revoked / Expired Tokens -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-danger/10 text-danger rounded-lg">
          <ShieldOff class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Revoked/Expired</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.revoked }}</h3>
        </div>
      </div>

      <!-- Total Token Uses -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-warning/10 text-warning rounded-lg">
          <Activity class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Uses</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.totalUses }}</h3>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="pageError || authError"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger animate-pulse" />
        <span class="text-sm font-medium text-danger">{{ pageError || authError }}</span>
      </div>
      <button
        @click="handleRefresh"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Tab Layout Header -->
    <div class="border-b border-subtle">
      <nav class="flex space-x-6" aria-label="Tabs">
        <button
          @click="activeTab = 'tokens'"
          class="pb-4 text-sm font-semibold transition-all border-b-2 cursor-pointer"
          :class="activeTab === 'tokens'
            ? 'border-primary text-primary font-bold'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
        >
          Tokens
        </button>
        <button
          @click="activeTab = 'config'"
          class="pb-4 text-sm font-semibold transition-all border-b-2 cursor-pointer"
          :class="activeTab === 'config'
            ? 'border-primary text-primary font-bold'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
        >
          Auth Config
        </button>
      </nav>
    </div>

    <!-- Tab Contents: Tokens -->
    <div v-if="activeTab === 'tokens'" class="space-y-4">
      <!-- Search/Filter Bar -->
      <div class="bg-card p-4 rounded-xl border border-subtle shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search class="w-4 h-4 text-muted-foreground" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, vhost, app, stream..."
            class="w-full pl-9 pr-4 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div class="w-full md:w-48">
          <select
            v-model="statusFilter"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked/Expired</option>
          </select>
        </div>

        <button
          @click="clearFilters"
          class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <X class="w-4 h-4" />
          <span>Clear Filters</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isAuthLoading && tokens.length === 0" class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-muted/50 border-b border-subtle">
                <th v-for="i in 11" :key="i" class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div class="h-3 bg-muted rounded w-16 animate-skeleton"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in 5" :key="row" class="border-t border-subtle">
                <td v-for="col in 11" :key="col" class="px-6 py-4">
                  <div class="h-4 bg-muted rounded w-20 animate-skeleton"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredTokens.length === 0"
        class="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-subtle text-center shadow-sm"
      >
        <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
          <Key class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-1">No tokens found</h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          {{ searchQuery || statusFilter !== 'all'
              ? 'No tokens match your search criteria. Try modifying your filters.'
              : 'Generate a publish token to secure your live streams.' }}
        </p>
        <button
          v-if="searchQuery || statusFilter !== 'all'"
          @click="clearFilters"
          class="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
        <button
          v-else
          @click="openGenerateModal"
          class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
        >
          <Plus class="w-4 h-4" />
          <span>Generate Token</span>
        </button>
      </div>

      <!-- Tokens Table -->
      <div v-else class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-muted/50 border-b border-subtle">
                <th
                  @click="toggleSort('name')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Name</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('name')" />
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  Token
                </th>
                <th
                  @click="toggleSort('vhost')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>VHost</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('vhost')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('app')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>App</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('app')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('streamName')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Stream Scope</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('streamName')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('createdAt')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Created</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('createdAt')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('expiresAt')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Expires</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('expiresAt')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('lastUsedAt')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Last Used</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('lastUsedAt')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('useCount')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Uses</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('useCount')" />
                  </div>
                </th>
                <th
                  @click="toggleSort('isRevoked')"
                  class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div class="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown class="w-3.5 h-3.5" :class="getSortIcon('isRevoked')" />
                  </div>
                </th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-subtle">
              <tr
                v-for="t in filteredTokens"
                :key="t.id"
                class="border-t border-subtle hover:bg-muted/30 transition-colors"
              >
                <!-- Name -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-semibold text-foreground text-sm">{{ t.name }}</span>
                </td>

                <!-- Token (Masked with Eye/Copy) -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono">
                  <div class="flex items-center space-x-2 bg-muted/60 px-2 py-1.5 rounded-lg border border-subtle max-w-[200px]">
                    <span class="text-xs text-foreground truncate select-all flex-1">
                      {{ visibleTokens[t.id] ? t.token : 'ps_••••••••••••••••' }}
                    </span>
                    <button
                      @click="toggleTokenVisibility(t.id)"
                      class="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                      :title="visibleTokens[t.id] ? 'Hide Token' : 'Show Token'"
                    >
                      <EyeOff v-if="visibleTokens[t.id]" class="w-3.5 h-3.5" />
                      <Eye v-else class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="handleCopyToClipboard(t)"
                      class="p-0.5 rounded cursor-pointer transition-colors"
                      :class="copiedTokenId === t.id ? 'text-success' : 'text-muted-foreground hover:text-foreground'"
                      title="Copy Token"
                    >
                      <ShieldCheck v-if="copiedTokenId === t.id" class="w-3.5 h-3.5" />
                      <Copy v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                <!-- VHost -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {{ t.vhost }}
                </td>

                <!-- App -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {{ t.app }}
                </td>

                <!-- Stream Scope -->
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span v-if="t.streamName" class="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs font-semibold">
                    {{ t.streamName }}
                  </span>
                  <span v-else class="text-muted-foreground/50 text-xs italic">All Streams (App-wide)</span>
                </td>

                <!-- Created -->
                <td class="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                  {{ formatDateTime(t.createdAt) }}
                </td>

                <!-- Expires -->
                <td class="px-6 py-4 whitespace-nowrap text-xs">
                  <span
                    v-if="t.expiresAt"
                    :class="new Date(t.expiresAt).getTime() < Date.now() ? 'text-danger font-medium' : 'text-muted-foreground'"
                  >
                    {{ formatDateTime(t.expiresAt) }}
                  </span>
                  <span v-else class="text-muted-foreground/50 italic">Never</span>
                </td>

                <!-- Last Used -->
                <td class="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                  {{ formatDateTime(t.lastUsedAt) }}
                </td>

                <!-- Uses -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                  {{ t.useCount }}
                </td>

                <!-- Status Badge -->
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    v-if="t.isRevoked"
                    class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20"
                  >
                    <span>Revoked</span>
                  </span>
                  <span
                    v-else-if="t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()"
                    class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20"
                  >
                    <span>Expired</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20"
                  >
                    <span>Active</span>
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                  <!-- Revoke Action -->
                  <button
                    v-if="!t.isRevoked && (!t.expiresAt || new Date(t.expiresAt).getTime() > Date.now())"
                    @click="handleRevokeToken(t.id)"
                    class="inline-flex items-center space-x-1 px-2 py-1 text-xs text-warning hover:bg-warning/10 hover:text-warning-hover rounded-lg transition-colors cursor-pointer"
                    title="Revoke Token"
                  >
                    <ShieldOff class="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>

                  <!-- Delete Action -->
                  <button
                    @click="requestDeleteToken(t.id)"
                    class="inline-flex items-center space-x-1 px-2 py-1 text-xs text-danger hover:bg-danger/10 hover:text-danger-hover rounded-lg transition-colors cursor-pointer"
                    title="Delete Token"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab Contents: Auth Config -->
    <div v-else class="space-y-6">
      <!-- VHost / App Selectors & Refresh -->
      <div class="bg-card p-4 rounded-xl border border-subtle shadow-sm flex flex-col md:flex-row md:items-end gap-4">
        <!-- VHost Selection -->
        <div class="flex-1 space-y-1.5">
          <label for="configVHostSelect" class="text-sm font-semibold text-foreground flex items-center space-x-1">
            <Server class="w-4 h-4 text-muted-foreground" />
            <span>Virtual Host</span>
          </label>
          <select
            id="configVHostSelect"
            v-model="configVHost"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option v-for="v in vhosts" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>

        <!-- App Selection -->
        <div class="flex-1 space-y-1.5">
          <label for="configAppSelect" class="text-sm font-semibold text-foreground flex items-center space-x-1">
            <Radio class="w-4 h-4 text-muted-foreground" />
            <span>Application Scope</span>
          </label>
          <select
            id="configAppSelect"
            v-model="configApp"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All Apps (VHost Level Config)</option>
            <option v-for="a in configApps" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>

        <!-- Action Button -->
        <div class="flex-shrink-0">
          <button
            @click="loadAuthConfig"
            :disabled="isConfigLoading"
            class="w-full md:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isConfigLoading }" />
            <span>Refresh Config</span>
          </button>
        </div>
      </div>

      <!-- Config Error Banner -->
      <div v-if="configError" class="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center space-x-3 text-danger">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <span class="text-sm font-medium">{{ configError }}</span>
      </div>

      <!-- Config Loading Skeleton -->
      <div v-if="isConfigLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="bg-card border border-subtle rounded-xl p-6 shadow-sm space-y-4">
          <div class="h-5 bg-muted rounded w-48 animate-skeleton"></div>
          <div class="space-y-3 pt-2">
            <div v-for="j in 3" :key="j" class="flex justify-between">
              <div class="h-4 bg-muted rounded w-24 animate-skeleton"></div>
              <div class="h-4 bg-muted rounded w-32 animate-skeleton"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Config Display Cards -->
      <div v-else-if="activeConfig" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Signed Policy Configuration -->
        <div class="bg-card border border-subtle rounded-xl p-6 shadow-sm space-y-5">
          <div class="flex items-center justify-between border-b border-subtle pb-4">
            <h3 class="flex items-center space-x-2 text-md font-bold text-foreground">
              <Shield class="w-5 h-5 text-primary" />
              <span>Signed Policy Access Control</span>
            </h3>
            <span
              v-if="activeConfig.signedPolicy"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20"
            >
              Configured
            </span>
            <span
              v-else
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-subtle"
            >
              Not Configured
            </span>
          </div>

          <div v-if="activeConfig.signedPolicy" class="space-y-4">
            <!-- Details list -->
            <div class="space-y-3">
              <div class="flex justify-between py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground">Policy Query Key Name</span>
                <span class="font-mono font-semibold text-foreground">
                  {{ activeConfig.signedPolicy.policyQueryKeyName || 'policy' }}
                </span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground">Signature Query Key Name</span>
                <span class="font-mono font-semibold text-foreground">
                  {{ activeConfig.signedPolicy.signatureQueryKeyName || 'signature' }}
                </span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground">Secret Key Security</span>
                <span class="font-semibold text-foreground">
                  {{ activeConfig.signedPolicy.secretKey ? '•••••••• (Masked)' : 'Not Configured' }}
                </span>
              </div>
            </div>

            <!-- Enables Section -->
            <div v-if="activeConfig.signedPolicy.enables" class="space-y-3 bg-muted/40 p-4 rounded-xl border border-subtle">
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Policy Enforcement Scopes</span>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="text-xs text-muted-foreground block mb-1">Providers</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="provider in activeConfig.signedPolicy.enables.providers.split(',').filter(Boolean)"
                      :key="provider"
                      class="px-2 py-0.5 bg-primary/5 text-primary text-xs font-semibold rounded"
                    >
                      {{ provider.trim() }}
                    </span>
                    <span v-if="!activeConfig.signedPolicy.enables.providers" class="text-xs text-muted-foreground italic">None</span>
                  </div>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground block mb-1">Publishers</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="publisher in activeConfig.signedPolicy.enables.publishers.split(',').filter(Boolean)"
                      :key="publisher"
                      class="px-2 py-0.5 bg-primary/5 text-primary text-xs font-semibold rounded"
                    >
                      {{ publisher.trim() }}
                    </span>
                    <span v-if="!activeConfig.signedPolicy.enables.publishers" class="text-xs text-muted-foreground italic">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <ShieldOff class="w-12 h-12 text-muted-foreground/30 mb-2" />
            <p class="text-sm">Signed Policy is not active for this scope.</p>
            <p class="text-xs mt-1 max-w-xs">Publishers can push streams without signed tokens unless Admission Webhooks are configured.</p>
          </div>
        </div>

        <!-- Admission Webhooks Configuration -->
        <div class="bg-card border border-subtle rounded-xl p-6 shadow-sm space-y-5">
          <div class="flex items-center justify-between border-b border-subtle pb-4">
            <h3 class="flex items-center space-x-2 text-md font-bold text-foreground">
              <Server class="w-5 h-5 text-primary" />
              <span>Admission Webhooks</span>
            </h3>
            <span
              v-if="activeConfig.admissionWebhooks"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20"
            >
              Configured
            </span>
            <span
              v-else
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-subtle"
            >
              Not Configured
            </span>
          </div>

          <div v-if="activeConfig.admissionWebhooks" class="space-y-4">
            <!-- Details list -->
            <div class="space-y-3">
              <div class="flex flex-col py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground mb-0.5">Control Server URL</span>
                <span class="font-semibold text-foreground break-all select-all font-mono text-xs">
                  {{ activeConfig.admissionWebhooks.controlServerUrl || '-' }}
                </span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground">Webhook Timeout</span>
                <span class="font-semibold text-foreground">
                  {{ activeConfig.admissionWebhooks.timeout ? `${activeConfig.admissionWebhooks.timeout} ms` : 'Not Configured' }}
                </span>
              </div>
              <div class="flex justify-between py-1.5 border-b border-subtle/50 text-sm">
                <span class="text-muted-foreground">Secret Key Security</span>
                <span class="font-semibold text-foreground">
                  {{ activeConfig.admissionWebhooks.secretKey ? '•••••••• (Masked)' : 'Not Configured' }}
                </span>
              </div>
            </div>

            <!-- Enables Section -->
            <div v-if="activeConfig.admissionWebhooks.enables" class="space-y-3 bg-muted/40 p-4 rounded-xl border border-subtle">
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Webhook Interception Scopes</span>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="text-xs text-muted-foreground block mb-1">Providers</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="provider in activeConfig.admissionWebhooks.enables.providers.split(',').filter(Boolean)"
                      :key="provider"
                      class="px-2 py-0.5 bg-primary/5 text-primary text-xs font-semibold rounded"
                    >
                      {{ provider.trim() }}
                    </span>
                    <span v-if="!activeConfig.admissionWebhooks.enables.providers" class="text-xs text-muted-foreground italic">None</span>
                  </div>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground block mb-1">Publishers</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="publisher in activeConfig.admissionWebhooks.enables.publishers.split(',').filter(Boolean)"
                      :key="publisher"
                      class="px-2 py-0.5 bg-primary/5 text-primary text-xs font-semibold rounded"
                    >
                      {{ publisher.trim() }}
                    </span>
                    <span v-if="!activeConfig.admissionWebhooks.enables.publishers" class="text-xs text-muted-foreground italic">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Server class="w-12 h-12 text-muted-foreground/30 mb-2" />
            <p class="text-sm">Admission Webhooks are not configured.</p>
            <p class="text-xs mt-1 max-w-xs">No webhooks will be triggered when publishers connect or streams change state.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Token Delete Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-card border border-subtle rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center space-x-3 text-danger">
            <AlertCircle class="w-6 h-6 animate-pulse" />
            <h3 class="text-lg font-bold text-foreground">Delete Publish Token</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            Are you sure you want to delete this token? This action is permanent, and any publishers currently using this token will be disconnected and unable to reconnect.
          </p>
          <div class="flex justify-end space-x-3 pt-2">
            <button
              @click="deleteConfirmId = null"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="confirmDeleteToken"
              class="px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generate Token Modal -->
    <PublishTokenForm
      :show="showGenerateModal"
      :vhosts="vhosts"
      :apps="modalApps"
      :vhost="selectedModalVHost"
      :app="selectedModalApp"
      @close="showGenerateModal = false"
      @created="refreshTokens"
      @vhost-change="handleModalVHostChange"
    />
  </div>
</template>
