import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { markerIcon } from '../lib/markerIcon'
import type { Entity } from '../types/entity'

const INDONESIA_CENTER: [number, number] = [-2.5, 118]

interface Props {
  entities: Entity[]
  selected: Entity | null
  onSelect: (id: string) => void
}

// Komponen di dalam <MapContainer> yang mengendalikan viewport peta.
function ViewportController({ entities, selected }: Pick<Props, 'entities' | 'selected'>) {
  const map = useMap()

  // Zoom agar semua marker terlihat, hanya saat himpunan entity berubah
  // (bukan tiap kali data di-refetch), supaya peta tidak "melompat" sendiri.
  const idsKey = entities.map((e) => e.id).join(',')
  useEffect(() => {
    if (entities.length === 0) return
    const bounds = latLngBounds(entities.map((e) => [e.latitude, e.longitude]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, idsKey])

  // Terbang ke entity yang dipilih (dari klik marker maupun klik daftar).
  const lat = selected?.latitude
  const lng = selected?.longitude
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 10), { duration: 0.8 })
  }, [map, lat, lng])

  return null
}

export default function EntityMap({ entities, selected, onSelect }: Props) {
  return (
    <MapContainer center={INDONESIA_CENTER} zoom={5} className="h-full w-full">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {entities.map((e) => {
        const isSelected = e.id === selected?.id
        return (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={markerIcon(e.status, isSelected)}
            title={e.name}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(e.id) }}
          />
        )
      })}
      <ViewportController entities={entities} selected={selected} />
    </MapContainer>
  )
}
