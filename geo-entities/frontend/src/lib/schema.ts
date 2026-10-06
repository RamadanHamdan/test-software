import { z } from 'zod'
import { ENTITY_STATUSES, ENTITY_TYPES } from '../types/entity'

// Aturan harus sama dengan tabel validasi di CLAUDE.md
// (backend: entity.Input, database: CHECK constraint).
export const entityInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Maksimal 100 karakter'),
  type: z.enum(ENTITY_TYPES, { error: 'Tipe tidak valid' }),
  status: z.enum(ENTITY_STATUSES, { error: 'Status tidak valid' }),
  description: z.string().max(500, 'Maksimal 500 karakter'),
  // Input form memakai valueAsNumber: field kosong menjadi NaN, yang ditolak z.number().
  latitude: z
    .number({ error: 'Latitude harus berupa angka' })
    .min(-90, 'Latitude minimal -90')
    .max(90, 'Latitude maksimal 90'),
  longitude: z
    .number({ error: 'Longitude harus berupa angka' })
    .min(-180, 'Longitude minimal -180')
    .max(180, 'Longitude maksimal 180'),
})

export type EntityInput = z.infer<typeof entityInputSchema>
