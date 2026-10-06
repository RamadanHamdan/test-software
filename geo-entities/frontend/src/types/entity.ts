// Nilai enum harus sama dengan backend (internal/entity/entity.go)
// dan CHECK constraint di migrations/.
export const ENTITY_TYPES = ['vehicle', 'iot_device', 'facility', 'other'] as const
export const ENTITY_STATUSES = ['active', 'inactive', 'maintenance'] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
export type EntityStatus = (typeof ENTITY_STATUSES)[number]

export interface Entity {
  id: string
  name: string
  type: EntityType
  status: EntityStatus
  description: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
}

export const TYPE_LABELS: Record<EntityType, string> = {
  vehicle: 'Kendaraan',
  iot_device: 'Perangkat IoT',
  facility: 'Fasilitas',
  other: 'Lainnya',
}

export const STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  maintenance: 'Perawatan',
}

export interface Coords {
  lat: number
  lng: number
}
