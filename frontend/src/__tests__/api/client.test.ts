import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('API Client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    if (typeof window !== 'undefined') {
      delete (window as any).__ENV__
    }
  })

  it('creates Axios instance with default baseURL when env is not set', async () => {
    vi.stubEnv('VITE_OME_API_BASE', '')
    vi.stubEnv('VITE_OME_API_USER', '')
    vi.stubEnv('VITE_OME_API_PASS', '')
    
    const { api } = await import('@/api/client')
    expect(api.defaults.baseURL).toBe('http://localhost:8081/v1')
  })

  it('creates Axios instance with custom VITE_OME_API_BASE from env', async () => {
    vi.stubEnv('VITE_OME_API_BASE', 'https://ome.example.com/v1')
    
    const { api } = await import('@/api/client')
    expect(api.defaults.baseURL).toBe('https://ome.example.com/v1')
  })

  it('creates Axios instance with custom VITE_OME_API_BASE from window.__ENV__', async () => {
    vi.stubEnv('VITE_OME_API_BASE', '') // clear env
    ;(window as any).__ENV__ = {
      VITE_OME_API_BASE: 'https://window-ome.example.com/v1',
    }
    
    const { api } = await import('@/api/client')
    expect(api.defaults.baseURL).toBe('https://window-ome.example.com/v1')
  })

  it('adds Basic auth header when username and password are provided', async () => {
    vi.stubEnv('VITE_OME_API_USER', 'admin')
    vi.stubEnv('VITE_OME_API_PASS', 'password')
    
    const { api } = await import('@/api/client')
    const expectedToken = btoa('admin:password')
    expect(api.defaults.headers.common['Authorization']).toBe(`Basic ${expectedToken}`)
  })

  it('adds Basic auth header when only password is provided', async () => {
    vi.stubEnv('VITE_OME_API_USER', '')
    vi.stubEnv('VITE_OME_API_PASS', 'secret')
    
    const { api } = await import('@/api/client')
    const expectedToken = btoa('secret')
    expect(api.defaults.headers.common['Authorization']).toBe(`Basic ${expectedToken}`)
  })

  it('does not add Authorization header if password is not provided', async () => {
    vi.stubEnv('VITE_OME_API_USER', 'admin')
    vi.stubEnv('VITE_OME_API_PASS', '')
    
    const { api } = await import('@/api/client')
    expect(api.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('has response interceptor that returns response and rejects error', async () => {
    const { api } = await import('@/api/client')
    
    // Test resolve
    const mockResponse = { data: 'test' }
    // @ts-ignore
    const resolvedValue = await api.interceptors.response.handlers[0].fulfilled(mockResponse)
    expect(resolvedValue).toBe(mockResponse)

    // Test reject
    const mockError = new Error('Network Error')
    // @ts-ignore
    const rejectPromise = api.interceptors.response.handlers[0].rejected(mockError)
    await expect(rejectPromise).rejects.toThrow('Network Error')
  })
})
