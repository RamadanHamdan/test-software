import { STATUS_COLORS } from '../lib/markerIcon'
import {
  STATUS_LABELS,
  TYPE_LABELS,
  type Entity,
  type EntityStatus,
} from '../types/entity'

interface Props {
  entities: Entity[]
  selected: Entity | null
  onSelect: (id: string | null) => void
}

function StatusDot({ status }: { status: EntityStatus }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: STATUS_COLORS[status] }}
    />
  )
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export default function EntitySidebar({ entities, selected, onSelect }: Props) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-base font-semibold">Geo Entities</h1>
        <p className="text-xs text-gray-500">{entities.length} entity</p>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {entities.length === 0 && (
          <li className="px-4 py-6 text-sm text-gray-500">Belum ada entity.</li>
        )}
        {entities.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSelect(e.id)}
              className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                e.id === selected?.id ? 'bg-blue-50' : ''
              }`}
            >
              <StatusDot status={e.status} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{e.name}</span>
                <span className="block text-xs text-gray-500">{TYPE_LABELS[e.type]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <section className="border-t border-gray-200 bg-gray-50 p-4 text-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="font-semibold">{selected.name}</h2>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs text-gray-500 hover:text-gray-800"
              aria-label="Tutup detail"
            >
              Tutup
            </button>
          </div>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1">
            <dt className="text-gray-500">Tipe</dt>
            <dd>{TYPE_LABELS[selected.type]}</dd>
            <dt className="text-gray-500">Status</dt>
            <dd className="flex items-center gap-2">
              <StatusDot status={selected.status} />
              {STATUS_LABELS[selected.status]}
            </dd>
            <dt className="text-gray-500">Koordinat</dt>
            <dd>
              {selected.latitude}, {selected.longitude}
            </dd>
            <dt className="text-gray-500">Deskripsi</dt>
            <dd>{selected.description || '-'}</dd>
            <dt className="text-gray-500">Dibuat</dt>
            <dd>{formatDate(selected.created_at)}</dd>
            <dt className="text-gray-500">Diubah</dt>
            <dd>{formatDate(selected.updated_at)}</dd>
          </dl>
        </section>
      )}
    </aside>
  )
}
