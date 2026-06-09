import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/api/client'
import { listApps, getApp, createApp, deleteApp, updateApp } from '@/api/apps'
import type { Application } from '@/types/ome'

// Mock the api client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('Apps API', () => {
  const vhost = 'default'
  const vhostEncoded = encodeURIComponent(vhost)
  const app = 'app_name_with_chars!'
  const appEncoded = encodeURIComponent(app)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listApps', () => {
    it('should call api.get with correct url and return data', async () => {
      const mockData = {
        statusCode: 200,
        message: 'OK',
        response: ['app1', 'app2']
      }
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await listApps(vhost)

      expect(api.get).toHaveBeenCalledWith(`/vhosts/${vhostEncoded}/apps`)
      expect(result).toEqual(mockData)
    })

    it('should handle special characters in vhost', async () => {
      const specialVhost = 'vhost/with#special?chars'
      const mockData = { statusCode: 200, message: 'OK', response: [] }
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      await listApps(specialVhost)

      expect(api.get).toHaveBeenCalledWith(`/vhosts/${encodeURIComponent(specialVhost)}/apps`)
    })
  })

  describe('getApp', () => {
    it('should call api.get with correct url and return data', async () => {
      const mockData = {
        statusCode: 200,
        message: 'OK',
        response: { name: app, type: 'live' }
      }
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await getApp(vhost, app)

      expect(api.get).toHaveBeenCalledWith(`/vhosts/${vhostEncoded}/apps/${appEncoded}`)
      expect(result).toEqual(mockData)
    })
  })

  describe('createApp', () => {
    it('should call api.post with correct url, wrap payload in array, and return data', async () => {
      const payload: Partial<Application> = {
        name: app,
        type: 'live'
      }
      const mockData = {
        statusCode: 200,
        message: 'OK',
        response: [payload]
      }
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockData })

      const result = await createApp(vhost, payload)

      expect(api.post).toHaveBeenCalledWith(`/vhosts/${vhostEncoded}/apps`, [payload])
      expect(result).toEqual(mockData)
    })
  })

  describe('updateApp', () => {
    it('should call api.put with correct url and payload, and return data', async () => {
      const payload: Partial<Application> = {
        type: 'vod'
      }
      const mockData = {
        statusCode: 200,
        message: 'OK',
        response: { name: app, type: 'vod' }
      }
      vi.mocked(api.put).mockResolvedValueOnce({ data: mockData })

      const result = await updateApp(vhost, app, payload)

      expect(api.put).toHaveBeenCalledWith(`/vhosts/${vhostEncoded}/apps/${appEncoded}`, payload)
      expect(result).toEqual(mockData)
    })
  })

  describe('deleteApp', () => {
    it('should call api.delete with correct url and return data', async () => {
      const mockData = {
        statusCode: 200,
        message: 'OK',
        response: null
      }
      vi.mocked(api.delete).mockResolvedValueOnce({ data: mockData })

      const result = await deleteApp(vhost, app)

      expect(api.delete).toHaveBeenCalledWith(`/vhosts/${vhostEncoded}/apps/${appEncoded}`)
      expect(result).toEqual(mockData)
    })
  })
})
