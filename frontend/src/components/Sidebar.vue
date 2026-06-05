<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  Server,
  Radio,
  Clock,
  BarChart3,
  Settings,
  Shield,
  X
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'close'): void
}>()

const route = useRoute()

// Sync route name with modelValue
watch(
  () => route.name,
  (newName) => {
    if (newName && typeof newName === 'string') {
      emit('update:modelValue', newName)
    }
  },
  { immediate: true }
)

const navItems = [
  {
    label: 'Dashboard',
    routeName: 'dashboard',
    path: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Virtual Hosts',
    routeName: 'vhosts',
    path: '/vhosts',
    icon: Server
  },
  {
    label: 'Streams',
    routeName: 'streams',
    path: '/streams',
    icon: Radio
  },
  {
    label: 'History',
    routeName: 'history',
    path: '/history',
    icon: Clock
  },
  {
    label: 'Statistics',
    routeName: 'stats',
    path: '/stats',
    icon: BarChart3
  },
  {
    label: 'Authentication',
    routeName: 'auth',
    path: '/auth',
    icon: Shield
  },
  {
    label: 'Settings',
    routeName: 'settings',
    path: '/settings',
    icon: Settings
  }
]
</script>

<template>
  <!-- Mobile backdrop overlay -->
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      @click="emit('close')"
    ></div>
  </transition>

  <!-- Sidebar container -->
  <aside
    class="fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 md:static md:translate-x-0"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Logo Area -->
    <div class="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
      <div class="flex items-center space-x-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          OME
        </div>
        <span class="font-semibold text-lg tracking-wider">OME Dashboard</span>
      </div>
      <!-- Mobile close button -->
      <button
        class="md:hidden p-1 rounded-md text-sidebar-muted hover:text-sidebar-foreground focus:outline-none"
        @click="emit('close')"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 py-6 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.routeName"
        :to="item.path"
        class="flex items-center px-6 py-3 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover border-l-4 border-transparent transition-colors duration-150"
        :class="item.routeName === 'dashboard'
          ? '[&.router-link-exact-active]:border-primary [&.router-link-exact-active]:bg-sidebar-hover [&.router-link-exact-active]:text-sidebar-foreground'
          : '[&.router-link-active]:border-primary [&.router-link-active]:bg-sidebar-hover [&.router-link-active]:text-sidebar-foreground'"
        @click="emit('close')"
      >
        <component :is="item.icon" class="w-5 h-5 mr-3" />
        <span class="font-medium text-sm">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>
