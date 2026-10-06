import { divIcon, type DivIcon } from 'leaflet'
import type { EntityStatus } from '../types/entity'

// Ikon marker bawaan Leaflet rusak di bundler (path gambar tidak ketemu),
// jadi kita pakai divIcon berupa lingkaran berwarna per status.
export const STATUS_COLORS: Record<EntityStatus, string> = {
  active: '#16a34a',
  inactive: '#6b7280',
  maintenance: '#d97706',
}

// Di-cache supaya objek ikon stabil; kalau dibuat ulang tiap render,
// react-leaflet akan mengganti ikon semua marker setiap render.
const cache = new Map<string, DivIcon>()

export function markerIcon(status: EntityStatus, selected: boolean): DivIcon {
  const key = `${status}:${selected}`
  const hit = cache.get(key)
  if (hit) return hit

  const size = selected ? 28 : 20
  const ring = selected ? '0 0 0 3px rgba(37,99,235,.9)' : '0 0 0 1px rgba(0,0,0,.45)'
  const icon = divIcon({
    className: '', // buang style default divIcon (kotak putih)
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${STATUS_COLORS[status]};border:3px solid #fff;box-shadow:${ring}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  cache.set(key, icon)
  return icon
}
