<script setup lang="ts">
import { Radio, Trash2 } from 'lucide-vue-next'

defineProps<{
  name: string
  type: string
  providers: string[]
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
        <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Radio class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-foreground">{{ name }}</h3>
          <span class="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground uppercase">
            {{ type }}
          </span>
        </div>
      </div>
      <button
        @click.stop="$emit('delete')"
        class="p-2 text-muted-foreground hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <span
        v-for="p in providers"
        :key="p"
        class="px-2.5 py-1 bg-primary/5 text-primary rounded-md text-xs font-semibold uppercase tracking-wide"
      >
        {{ p }}
      </span>
      <span v-if="providers.length === 0" class="text-xs text-muted-foreground">
        No providers configured
      </span>
    </div>

    <div class="mt-4 pt-4 border-t border-subtle">
      <span class="text-xs text-muted-foreground">Click to view details →</span>
    </div>
  </div>
</template>
