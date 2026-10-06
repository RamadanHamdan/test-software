import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { latLng, latLngBounds, type Marker as LeafletMarker } from 'leaflet'
import { draftIcon, markerIcon } from '../lib/markerIcon'
import type { Coords, Entity } from '../types/entity'

const INDONESIA_CENTER: [number, number] = [-2.5, 118]

interface Props {
  entities: Entity[]
  selected: Entity | null
  onSelect: (id: string) => void
  /** Entity yang disembunyikan (sedang diedit; diganti penanda draft). */
  hiddenId?: string | null
  /** Lokasi yang sedang dipilih di form. */
  draft?: Coords | null
  /** Jika ada, peta masuk mode "pilih lokasi": klik peta / seret penanda draft. */
  onPick?: (c: Coords) => void
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

function toCoords(ll: { lat: number; lng: number }): Coords {
  // wrap(): saat peta digeser melewati batas dunia, lng bisa di luar -180..180.
  const w = latLng(ll.lat, ll.lng).wrap()
  return { lat: round6(w.lat), lng: round6(w.lng) }
}

function PickHandler({ onPick }: { onPick?: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(toCoords(e.latlng))
    },
  })
  return null
}

// Komponen di dalam <MapContainer> yang mengendalikan viewport peta.
function ViewportController({
  entities,
  selected,
  draft,
}: Pick<Props, 'entities' | 'selected' | 'draft'>) {
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

  // Jika koordinat draft (mis. diketik di form) jatuh di luar layar, geser peta.
  const dLat = draft?.lat
  const dLng = draft?.lng
  useEffect(() => {
    if (dLat === undefined || dLng === undefined) return
    const p = latLng(dLat, dLng)
    if (!map.getBounds().contains(p)) map.panTo(p)
  }, [map, dLat, dLng])

  return null
}

export default function EntityMap({
  entities,
  selected,
  onSelect,
  hiddenId = null,
  draft = null,
  onPick,
}: Props) {
  return (
    <MapContainer center={INDONESIA_CENTER} zoom={5} className="h-full w-full">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <PickHandler onPick={onPick} />

      {entities
        .filter((e) => e.id !== hiddenId)
        .map((e) => {
          const isSelected = e.id === selected?.id
          return (
            <Marker
              key={e.id}
              position={[e.latitude, e.longitude]}
              icon={markerIcon(e.status, isSelected)}
              title={e.name}
              zIndexOffset={isSelected ? 1000 : 0}
              // Di mode pilih lokasi, marker lain tidak menangkap klik.
              interactive={!onPick}
              eventHandlers={onPick ? {} : { click: () => onSelect(e.id) }}
            />
          )
        })}

      {onPick && draft && (
        <Marker
          position={[draft.lat, draft.lng]}
          icon={draftIcon}
          draggable
          zIndexOffset={2000}
          eventHandlers={{
            dragend: (ev) => onPick(toCoords((ev.target as LeafletMarker).getLatLng())),
          }}
        />
      )}

      <ViewportController entities={entities} selected={selected} draft={draft} />
    </MapContainer>
  )
}
