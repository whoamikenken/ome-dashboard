import { ref } from 'vue'
import type { PublishToken, AuthConfig, TokenCreateInput } from '@/types/auth'
import { getVHost } from '@/api/vhosts'

const TOKENS_KEY = 'ome_publish_tokens'

export function usePublishAuth() {
  const tokens = ref<PublishToken[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load initial tokens from localStorage
  const loadTokens = () => {
    try {
      const stored = localStorage.getItem(TOKENS_KEY)
      if (stored) {
        tokens.value = JSON.parse(stored)
      } else {
        tokens.value = []
      }
    } catch (err) {
      console.error('Failed to load tokens from localStorage', err)
      tokens.value = []
    }
  }

  const saveTokens = () => {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens.value))
    } catch (err) {
      console.error('Failed to save tokens to localStorage', err)
    }
  }

  loadTokens()

  const generateToken = async (input: TokenCreateInput): Promise<PublishToken> => {
    isLoading.value = true
    error.value = null
    try {
      // Simulate API lag
      await new Promise(resolve => setTimeout(resolve, 800))

      if (!input.name.trim()) {
        throw new Error('Token name is required')
      }

      // Generate a mock token key
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const tokenString = `ps_${randomPart}`

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      const newToken: PublishToken = {
        id: Math.random().toString(36).substring(2, 9),
        name: input.name,
        token: tokenString,
        vhost: input.vhost,
        app: input.app,
        streamName: input.streamName || '',
        createdAt: new Date().toISOString(),
        expiresAt,
        isRevoked: false,
        lastUsedAt: null,
        useCount: 0
      }

      tokens.value.unshift(newToken)
      saveTokens()
      return newToken
    } catch (err: any) {
      error.value = err.message || 'Failed to generate token'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const revokeToken = async (id: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const token = tokens.value.find(t => t.id === id)
      if (token) {
        token.isRevoked = true
        saveTokens()
      } else {
        throw new Error('Token not found')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to revoke token'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteToken = async (id: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const index = tokens.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tokens.value.splice(index, 1)
        saveTokens()
      } else {
        throw new Error('Token not found')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete token'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getTokenById = async (id: string): Promise<PublishToken | undefined> => {
    return tokens.value.find(t => t.id === id)
  }

  const refresh = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      loadTokens()
    } catch (err: any) {
      error.value = err.message || 'Failed to refresh tokens'
    } finally {
      isLoading.value = false
    }
  }

  const copyToClipboard = async (token: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(token)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
      throw new Error('Failed to copy token to clipboard')
    }
  }

  const getStats = () => {
    const now = Date.now()
    let total = 0
    let active = 0
    let revoked = 0
    let totalUses = 0

    tokens.value.forEach(t => {
      total++
      totalUses += t.useCount
      if (t.isRevoked) {
        revoked++
      } else if (t.expiresAt && new Date(t.expiresAt).getTime() < now) {
        revoked++
      } else {
        active++
      }
    })

    return {
      total,
      active,
      revoked,
      totalUses
    }
  }

  const fetchAuthConfig = async (vhostName: string, appName?: string): Promise<AuthConfig> => {
    isLoading.value = true
    error.value = null
    try {
      const vhostData = await getVHost(vhostName)
      return {
        vhost: vhostName,
        app: appName || null,
        signedPolicy: vhostData.response?.signedPolicy || null,
        admissionWebhooks: vhostData.response?.admissionWebhooks || null
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch auth configuration'
      error.value = errMsg
      throw new Error(errMsg)
    } finally {
      isLoading.value = false
    }
  }

  const pruneExpired = async (): Promise<void> => {
    const now = Date.now()
    let changed = false
    tokens.value.forEach(t => {
      if (!t.isRevoked && t.expiresAt && new Date(t.expiresAt).getTime() < now) {
        t.isRevoked = true
        changed = true
      }
    })
    if (changed) {
      saveTokens()
    }
  }

  return {
    tokens,
    isLoading,
    error,
    generateToken,
    revokeToken,
    deleteToken,
    getTokenById,
    refresh,
    copyToClipboard,
    getStats,
    fetchAuthConfig,
    pruneExpired
  }
}
