<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVHostStore } from '@/stores/vhosts'
import VHostCard from '@/components/VHostCard.vue'
import VHostForm from '@/components/VHostForm.vue'
import { Search, Plus, Server, AlertCircle, RefreshCw } from 'lucide-vue-next'

const store = useVHostStore()
const router = useRouter()
const showCreateModal = ref(false)

onMounted(() => {
  store.fetchVHosts()
})

function viewVHost(name: string) {
  router.push({ name: 'vhost-detail', params: { vhost: name } })
}

async function confirmDelete(name: string) {
  if (confirm(`Are you sure you want to delete virtual host "${name}"?`)) {
    await store.removeVHost(name)
  }
}

function handleCreated() {
  showCreateModal.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Virtual Hosts</h1>
        <p class="text-sm text-muted-foreground mt-1">Manage your OvenMediaEngine virtual hosts</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="store.fetchVHosts()"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': store.isLoading }" />
        </button>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Create VHost</span>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative max-w-md">
      <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search class="w-5 h-5 text-muted-foreground" />
      </span>
      <input
        v-model="store.searchQuery"
        @input="store.setSearchQuery(store.searchQuery)"
        type="text"
        placeholder="Search virtual hosts..."
        class="w-full pl-10 pr-4 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
      />
    </div>

    <!-- Error Banner -->
    <div
      v-if="store.error"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger" />
        <span class="text-sm font-medium text-danger">{{ store.error }}</span>
      </div>
      <button
        @click="store.fetchVHosts()"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="store.isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 4"
        :key="i"
        class="bg-card rounded-xl border border-subtle p-6 h-[166px] flex flex-col justify-between"
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
          <div class="h-3 animate-skeleton rounded w-16"></div>
          <div class="h-3 animate-skeleton rounded w-24"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="store.filteredVHosts.length === 0"
      class="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-subtle text-center"
    >
      <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
        <Server class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">No virtual hosts found</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        {{ store.searchQuery ? `No results found for "${store.searchQuery}". Try modifying your search.` : 'Create your first virtual host to get started.' }}
      </p>
      <button
        v-if="!store.searchQuery"
        @click="showCreateModal = true"
        class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Create VHost</span>
      </button>
    </div>

    <!-- VHost Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <VHostCard
        v-for="name in store.filteredVHosts"
        :key="name"
        :name="name"
        :hostNames="store.getVHostDetail(name)?.host[0]?.names || []"
        :hasTls="!!store.getVHostDetail(name)?.host[0]?.tls"
        @click="viewVHost(name)"
        @delete="confirmDelete(name)"
      />
    </div>

    <!-- VHostForm Modal -->
    <VHostForm
      :show="showCreateModal"
      @close="showCreateModal = false"
      @created="handleCreated"
    />
  </div>
</template>
