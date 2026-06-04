<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{
  name: string
  hostNames: string[]
  hasTls: boolean
}>()

defineEmits<{
  (e: 'click'): void
  (e: 'delete'): void
}>()
</script>

<template>
  <div
    class="bg-card rounded-xl border border-subtle p-6 hover:shadow-md transition-shadow cursor-pointer"
    @click="$emit('click')"
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {{ name.charAt(0).toUpperCase() }}
        </div>
        <div>
          <h3 class="text-lg font-semibold text-foreground">{{ name }}</h3>
          <p class="text-xs text-muted-foreground">{{ hostNames.length }} host name(s)</p>
        </div>
      </div>
      <button
        @click.stop="$emit('delete')"
        class="p-2 text-muted-foreground hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <span
        v-for="hn in hostNames.slice(0, 3)"
        :key="hn"
        class="px-2.5 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground"
      >
        {{ hn }}
      </span>
      <span
        v-if="hostNames.length > 3"
        class="px-2.5 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground"
      >
        +{{ hostNames.length - 3 }} more
      </span>
    </div>

    <div class="flex items-center justify-between pt-4 border-t border-subtle">
      <div class="flex items-center space-x-2">
        <div
          class="w-2 h-2 rounded-full"
          :class="hasTls ? 'bg-success' : 'bg-muted-foreground'"
        ></div>
        <span class="text-xs text-muted-foreground">{{ hasTls ? 'TLS Enabled' : 'No TLS' }}</span>
      </div>
      <span class="text-xs text-muted-foreground">Click to view details &rarr;</span>
    </div>
  </div>
</template>
