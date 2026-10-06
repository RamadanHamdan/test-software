import type { Entity, EntityStatus, EntityType } from '../types/entity'
import type { EntityInput } from './schema'

// Error dari backend: { error, message, details: { field: pesan } }
export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, string>

  constructor(status: number, code: string, message: string, details: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  })

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? 'unknown_error',
      body?.message ?? res.statusText,
      body?.details ?? {},
    )
  }
  return body as T
}

export interface ListFilter {
  type?: EntityType
  status?: EntityStatus
  q?: string
}

export const api = {
  list(filter: ListFilter = {}) {
    const params = new URLSearchParams()
    if (filter.type) params.set('type', filter.type)
    if (filter.status) params.set('status', filter.status)
    if (filter.q) params.set('q', filter.q)
    const qs = params.toString()
    return request<Entity[]>(`/entities${qs ? `?${qs}` : ''}`)
  },
  get(id: string) {
    return request<Entity>(`/entities/${id}`)
  },
  create(input: EntityInput) {
    return request<Entity>('/entities', { method: 'POST', body: JSON.stringify(input) })
  },
  update(id: string, input: EntityInput) {
    return request<Entity>(`/entities/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },
  remove(id: string) {
    return request<void>(`/entities/${id}`, { method: 'DELETE' })
  },
}
