import { api } from './client'
import type { Stream, OmeResponse } from '@/types/ome'

export async function listStreams(vhost: string, app: string) {
  const res = await api.get<OmeResponse<string[]>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}/streams`)
  return res.data
}

export async function getStream(vhost: string, app: string, stream: string) {
  const res = await api.get<OmeResponse<Stream>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}/streams/${encodeURIComponent(stream)}`)
  return res.data
}

export async function deleteStream(vhost: string, app: string, stream: string) {
  const res = await api.delete<OmeResponse<null>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}/streams/${encodeURIComponent(stream)}`)
  return res.data
}

export async function pullStream(vhost: string, app: string, data: { name: string; urls: string[] }) {
  const res = await api.post<OmeResponse<any>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}/streams`, data)
  return res.data
}

