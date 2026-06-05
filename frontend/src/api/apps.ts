import { api } from './client'
import type { Application, OmeResponse } from '@/types/ome'

export async function listApps(vhost: string) {
  const res = await api.get<OmeResponse<string[]>>(`/vhosts/${encodeURIComponent(vhost)}/apps`)
  return res.data
}

export async function getApp(vhost: string, app: string) {
  const res = await api.get<OmeResponse<Application>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}`)
  return res.data
}

export async function createApp(vhost: string, data: Partial<Application>) {
  const res = await api.post<OmeResponse<Application>[]>(`/vhosts/${encodeURIComponent(vhost)}/apps`, [data])
  return res.data
}

export async function deleteApp(vhost: string, app: string) {
  const res = await api.delete<OmeResponse<null>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}`)
  return res.data
}

export async function updateApp(vhost: string, app: string, data: Partial<Application>): Promise<OmeResponse<Application>> {
  const res = await api.put<OmeResponse<Application>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}`, data)
  return res.data
}

