import { api } from './client'
import type { AxiosInstance } from 'axios'
import type { VHost, OmeResponse } from '@/types/ome'

export async function listVHosts(customApi?: AxiosInstance) {
  const client = customApi || api
  const res = await client.get<OmeResponse<string[]>>('/vhosts')
  return res.data
}

export async function getVHost(name: string) {
  const res = await api.get<OmeResponse<VHost>>(`/vhosts/${encodeURIComponent(name)}`)
  return res.data
}

export async function createVHost(data: Partial<VHost>) {
  const res = await api.post<OmeResponse<VHost>[]>('/vhosts', [data])
  return res.data
}

export async function deleteVHost(name: string) {
  const res = await api.delete<OmeResponse<null>>(`/vhosts/${encodeURIComponent(name)}`)
  return res.data
}
