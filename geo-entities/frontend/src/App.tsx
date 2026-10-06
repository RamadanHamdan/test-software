import { useState } from 'react'
import EntityMap from './components/EntityMap'
import EntitySidebar from './components/EntitySidebar'
import { useEntities } from './hooks/useEntities'

export default function App() {
  const { data, isPending, error, refetch } = useEntities()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (isPending) return <p className="p-6">Memuat…</p>
  if (error) {
    return (
      <div className="p-6">
        <p className="mb-3 text-red-600">Gagal memuat data: {error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  // Detail diambil dari data list; kalau entity dihapus, selected otomatis jadi null.
  const selected = data.find((e) => e.id === selectedId) ?? null

  return (
    <div className="flex h-screen">
      <EntitySidebar entities={data} selected={selected} onSelect={setSelectedId} />
      <main className="min-w-0 flex-1">
        <EntityMap entities={data} selected={selected} onSelect={setSelectedId} />
      </main>
    </div>
  )
}
