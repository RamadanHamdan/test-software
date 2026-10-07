import { useState } from 'react'
import ConfirmDialog from './components/ConfirmDialog'
import EntityForm from './components/EntityForm'
import EntityMap from './components/EntityMap'
import EntitySidebar from './components/EntitySidebar'
import { useDeleteEntity, useEntities } from './hooks/useEntities'
import type { Coords, Entity } from './types/entity'

type Mode = { kind: 'view' } | { kind: 'create' } | { kind: 'edit'; id: string }

export default function App() {
  const { data, isPending, error, refetch } = useEntities()
  const del = useDeleteEntity()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [draft, setDraft] = useState<Coords | null>(null)
  const [deleting, setDeleting] = useState<Entity | null>(null)

  if (isPending) return <p className='p-6'>Memuat…</p>
  if (error) {
    return (
      <div className='p-6'>
        <p className='mb-3 text-red-600'>Gagal memuat data: {error.message}</p>
        <button
          type='button'
          onClick={() => refetch()}
          className='rounded bg-gray-900 px-3 py-1.5 text-sm text-white'
        >
          Coba lagi
        </button>
      </div>
    )
  }

  // Detail diambil dari data list; kalau entity dihapus, selected otomatis jadi null.
  const selected = data.find((e) => e.id === selectedId) ?? null
  const editing =
    mode.kind === 'edit' ? (data.find((e) => e.id === mode.id) ?? null) : null
  const formOpen = mode.kind === 'create' || editing !== null

  const closeForm = () => {
    setMode({ kind: 'view' })
    setDraft(null)
  }

  const startCreate = () => {
    setMode({ kind: 'create' })
    setDraft(null)
  }

  const startEdit = (e: Entity) => {
    setSelectedId(e.id)
    setMode({ kind: 'edit', id: e.id })
    setDraft({ lat: e.latitude, lng: e.longitude })
  }

  const closeDeleteDialog = () => {
    del.reset()
    setDeleting(null)
  }

  const confirmDelete = () => {
    if (!deleting) return
    const id = deleting.id
    del.mutate(id, {
      onSuccess: () => {
        setSelectedId((cur) => (cur === id ? null : cur))
        closeDeleteDialog()
      },
    })
  }

  return (
    <div className='flex h-screen'>
      {formOpen ? (
        <EntityForm
          // key: form di-remount saat pindah antara tambah / ubah entity lain.
          key={editing?.id ?? 'new'}
          entity={editing}
          draft={draft}
          onDraftChange={setDraft}
          onCancel={closeForm}
          onSaved={(saved) => {
            closeForm()
            setSelectedId(saved.id)
          }}
        />
      ) : (
        <EntitySidebar
          entities={data}
          selected={selected}
          onSelect={setSelectedId}
          onCreate={startCreate}
          onEdit={startEdit}
          onDelete={setDeleting}
        />
      )}

      <main className='min-w-0 flex-1'>
        <EntityMap
          entities={data}
          selected={selected}
          onSelect={setSelectedId}
          hiddenId={editing?.id ?? null}
          draft={draft}
          onPick={formOpen ? setDraft : undefined}
        />
      </main>

      {deleting && (
        <ConfirmDialog
          title='Hapus entity?'
          message={`“${deleting.name}” akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel='Hapus'
          pending={del.isPending}
          error={del.error?.message}
          onConfirm={confirmDelete}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  )
}
