import { describe, it, expect, beforeEach } from 'vitest'
import { usePublishAuth } from '../../composables/usePublishAuth'
import type { TokenCreateInput } from '@/types/auth'

describe('usePublishAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates a token successfully', async () => {
    const { generateToken, tokens, error } = usePublishAuth()

    const input: TokenCreateInput = {
      name: 'Test Token',
      vhost: 'default',
      app: 'app',
      streamName: 'stream'
    }

    const token = await generateToken(input)

    expect(token).toBeDefined()
    expect(token.name).toBe('Test Token')
    expect(token.vhost).toBe('default')
    expect(token.app).toBe('app')
    expect(token.streamName).toBe('stream')
    expect(token.token).toMatch(/^ps_[a-z0-9]+$/)
    expect(tokens.value.length).toBe(1)
    expect(tokens.value[0]).toEqual(token)
    expect(error.value).toBeNull()
  })

  it('handles error when token name is empty', async () => {
    const { generateToken, error } = usePublishAuth()

    const input: TokenCreateInput = {
      name: '   ',
      vhost: 'default',
      app: 'app',
      streamName: 'stream'
    }

    await expect(generateToken(input)).rejects.toThrow('Token name is required')
    expect(error.value).toBe('Token name is required')
  })
})
