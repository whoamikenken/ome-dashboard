<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Menu, Sun, Moon } from 'lucide-vue-next'

const props = defineProps<{
  theme: 'light' | 'dark'
  connected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleTheme'): void
  (e: 'toggleSidebar'): void
}>()

const route = useRoute()
const currentTime = ref('')

// Compute breadcrumbs from path
const breadcrumbs = computed(() => {
  const list = []
  const pathSegments = route.path.split('/').filter(Boolean)

  list.push({ label: 'Dashboard', to: '/' })

  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    let label = segment
    if (route.params.vhost && segment === route.params.vhost) {
      label = String(segment)
    } else if (route.params.app && segment === route.params.app) {
      label = String(segment)
    } else {
      label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
    }

    if (index === pathSegments.length - 1) {
      list.push({ label, to: null })
    } else {
      const to = segment === 'vhosts' ? '/vhosts' : currentPath
      list.push({ label, to })
    }
  })
  return list
})

// Clock logic
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' ' + now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

let timer: ReturnType<typeof setInterval>

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <header class="flex items-center justify-between h-16 px-6 bg-card border-b border-subtle text-foreground shadow-sm">
    <!-- Left Side: Hamburger & Breadcrumbs -->
    <div class="flex items-center space-x-4">
      <button
        class="md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none transition-colors duration-150"
        @click="emit('toggleSidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>

      <!-- Breadcrumbs for larger screens -->
      <nav class="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
        <div v-for="(crumb, idx) in breadcrumbs" :key="idx" class="flex items-center space-x-2">
          <span v-if="idx > 0" class="text-xs">/</span>
          <RouterLink
            v-if="crumb.to"
            :to="crumb.to"
            class="hover:text-primary transition-colors duration-150 font-medium"
          >
            {{ crumb.label }}
          </RouterLink>
          <span v-else class="text-foreground font-semibold">
            {{ crumb.label }}
          </span>
        </div>
      </nav>
      <!-- Fallback title for mobile -->
      <span class="sm:hidden font-semibold text-foreground">
        {{ breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard' }}
      </span>
    </div>

    <!-- Right Side: Clock, Connection Status, Theme Toggle -->
    <div class="flex items-center space-x-6">
      <!-- Live Clock -->
      <div class="hidden md:block text-xs font-mono text-muted-foreground">
        {{ currentTime }}
      </div>

      <!-- Status Indicator -->
      <div class="flex items-center space-x-2">
        <span class="relative flex h-2.5 w-2.5">
          <span
            v-if="connected"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"
          ></span>
          <span
            class="relative inline-flex rounded-full h-2.5 w-2.5"
            :class="connected ? 'bg-success' : 'bg-danger'"
          ></span>
        </span>
        <span class="text-sm font-medium text-muted-foreground">
          {{ connected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>

      <!-- Theme Switcher -->
      <button
        class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none transition-colors duration-150"
        @click="emit('toggleTheme')"
        title="Toggle Theme"
      >
        <Sun v-if="theme === 'dark'" class="w-5 h-5" />
        <Moon v-else class="w-5 h-5" />
      </button>
    </div>
  </header>
</template>
