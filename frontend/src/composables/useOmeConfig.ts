import { ref } from 'vue'
import axios from 'axios'
import { api } from '@/api/client'

export interface OmeConfig {
  host: string
  port: number
  useTls: boolean
  username: string
  password: string
}

export const config = ref<OmeConfig>({
  host: '',
  port: 8081,
  useTls: false,
  username: '',
  password: '',
})

export const theme = ref<'light' | 'dark'>('light')
export const isTesting = ref(false)
export const testResult = ref<{ success: boolean; message: string } | null>(null)

// Helper to parse base URL from env if available
function parseBaseUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80)
    const useTls = parsed.protocol === 'https:'
    return { host, port, useTls }
  } catch (e) {
    return { host: 'localhost', port: 8081, useTls: false }
  }
}

export function loadConfig() {
  // Load Theme
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  theme.value = savedTheme || 'light'

  // Load Config
  const savedConfig = localStorage.getItem('ome_config')
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig)
      config.value = {
        host: parsed.host || '',
        port: parsed.port !== undefined ? Number(parsed.port) : 8081,
        useTls: !!parsed.useTls,
        username: parsed.username || '',
        password: parsed.password || '',
      }
      return
    } catch (e) {
      // Fallback
    }
  }

  // Fallback to Env
  const envBaseUrl = window.__ENV__?.VITE_OME_API_BASE || import.meta.env.VITE_OME_API_BASE || 'http://localhost:8081/v1'
  const { host, port, useTls } = parseBaseUrl(envBaseUrl)
  config.value = {
    host,
    port,
    useTls,
    username: window.__ENV__?.VITE_OME_API_USER || import.meta.env.VITE_OME_API_USER || '',
    password: window.__ENV__?.VITE_OME_API_PASS || import.meta.env.VITE_OME_API_PASS || '',
  }
}

export function applyConfig() {
  const { host, port, useTls, username, password } = config.value
  const protocol = useTls ? 'https' : 'http'
  // Base url must end with /v1
  api.defaults.baseURL = `${protocol}://${host}:${port}/v1`

  if (password) {
    const token = username
      ? btoa(`${username}:${password}`)
      : btoa(password)
    api.defaults.headers.common['Authorization'] = `Basic ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export function saveConfig() {
  localStorage.setItem('ome_config', JSON.stringify(config.value))
  applyConfig()
}

export async function testConnection(): Promise<boolean> {
  isTesting.value = true
  testResult.value = null
  
  const { host, port, useTls, username, password } = config.value
  const protocol = useTls ? 'https' : 'http'
  const baseURL = `${protocol}://${host}:${port}/v1`
  
  const headers: Record<string, string> = {}
  if (password) {
    const token = username
      ? btoa(`${username}:${password}`)
      : btoa(password)
    headers['Authorization'] = `Basic ${token}`
  }
  
  try {
    const tempInstance = axios.create({
      baseURL,
      headers,
      timeout: 5000,
    })
    
    await tempInstance.get('/vhosts')
    testResult.value = { success: true, message: 'Connected' }
    isTesting.value = false
    return true
  } catch (error: any) {
    console.error('Test Connection Error:', error)
    let message = 'Connection failed'
    if (error.response) {
      message = `Server responded with status ${error.response.status}`
    } else if (error.request) {
      message = 'No response received from server. Verify host and port.'
    } else {
      message = error.message
    }
    testResult.value = { success: false, message }
    isTesting.value = false
    return false
  }
}

// Initialize config on import
loadConfig()
applyConfig()
