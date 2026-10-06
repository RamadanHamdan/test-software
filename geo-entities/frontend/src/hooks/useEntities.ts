import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ListFilter } from '../lib/api'
import type { EntityInput } from '../lib/schema'

const keys = {
  all: ['entities'] as const,
  list: (filter: ListFilter) => [...keys.all, 'list', filter] as const,
  detail: (id: string | null) => [...keys.all, 'detail', id] as const,
}

export function useEntities(filter: ListFilter = {}) {
  return useQuery({ queryKey: keys.list(filter), queryFn: () => api.list(filter) })
}

export function useEntity(id: string | null) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.get(id as string),
    enabled: id !== null,
  })
}

// Setelah mutasi apa pun, semua query "entities" (list + detail) dibuat basi
// supaya peta dan panel detail otomatis mengambil data terbaru.
function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: keys.all })
}

export function useCreateEntity() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: EntityInput) => api.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateEntity() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EntityInput }) => api.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteEntity() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: invalidate,
  })
}
