<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="emit('close')"></div>
        <div class="bg-card rounded-2xl border border-subtle shadow-2xl w-full max-w-lg z-10 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-foreground">Create Virtual Host</h2>
            <button @click="emit('close')" class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="formError" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {{ formError }}
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input v-model="form.name" placeholder="e.g. default" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-1">Host Names *</label>
              <div v-for="(_, idx) in form.hostNames" :key="idx" class="flex items-center space-x-2 mb-2">
                <input v-model="form.hostNames[idx]" :placeholder="`Host name ${idx + 1}`" class="flex-1 px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
                <button v-if="form.hostNames.length > 1" type="button" @click="removeHostName(idx)" class="p-2 text-muted-foreground hover:text-danger transition-colors">
                  <X class="w-4 h-4" />
                </button>
              </div>
              <button type="button" @click="addHostName" class="text-sm text-primary hover:text-primary-hover font-medium">+ Add host name</button>
            </div>

            <div class="flex items-center space-x-3">
              <input type="checkbox" v-model="form.tlsEnabled" id="tls-toggle" class="rounded border-subtle" />
              <label for="tls-toggle" class="text-sm font-medium text-foreground">Enable TLS</label>
            </div>

            <div v-if="form.tlsEnabled" class="space-y-3 pl-6 border-l-2 border-primary/30">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Cert Path</label>
                <input v-model="form.certPath" placeholder="/path/to/cert.pem" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Chain Cert Path</label>
                <input v-model="form.chainCertPath" placeholder="/path/to/chain.pem" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Key Path</label>
                <input v-model="form.keyPath" placeholder="/path/to/key.pem" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="emit('close')" class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50">
                {{ isSubmitting ? 'Creating...' : 'Create Virtual Host' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVHostStore } from '@/stores/vhosts'
import { X } from 'lucide-vue-next'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const store = useVHostStore()

const form = ref({
  name: '',
  hostNames: [''],
  tlsEnabled: false,
  certPath: '',
  chainCertPath: '',
  keyPath: '',
})

const isSubmitting = ref(false)
const formError = ref<string | null>(null)

async function handleSubmit() {
  if (!form.value.name.trim()) {
    formError.value = 'Virtual host name is required'
    return
  }
  if (!form.value.hostNames[0]?.trim()) {
    formError.value = 'At least one host name is required'
    return
  }

  isSubmitting.value = true
  formError.value = null

  const hosts = form.value.hostNames.filter(h => h.trim())
  const payload: any = {
    name: form.value.name,
    host: [{
      names: hosts,
    }],
  }

  if (form.value.tlsEnabled) {
    payload.host[0].tls = {
      certPath: form.value.certPath,
      chainCertPath: form.value.chainCertPath,
      keyPath: form.value.keyPath,
    }
  }

  const success = await store.addVHost(payload)
  isSubmitting.value = false

  if (success) {
    emit('created')
    resetForm()
  } else {
    formError.value = store.error
  }
}

function resetForm() {
  form.value = {
    name: '',
    hostNames: [''],
    tlsEnabled: false,
    certPath: '',
    chainCertPath: '',
    keyPath: '',
  }
  formError.value = null
}

function addHostName() {
  form.value.hostNames.push('')
}

function removeHostName(index: number) {
  if (form.value.hostNames.length > 1) {
    form.value.hostNames.splice(index, 1)
  }
}
</script>
