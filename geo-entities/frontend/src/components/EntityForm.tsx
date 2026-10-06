import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateEntity, useUpdateEntity } from '../hooks/useEntities'
import { ApiError } from '../lib/api'
import { entityInputSchema, type EntityInput } from '../lib/schema'
import {
  ENTITY_STATUSES,
  ENTITY_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
  type Coords,
  type Entity,
} from '../types/entity'

const FIELDS = ['name', 'type', 'status', 'description', 'latitude', 'longitude'] as const
type FieldName = (typeof FIELDS)[number]
const isField = (k: string): k is FieldName => (FIELDS as readonly string[]).includes(k)

const inputCls =
  'w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none'

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

// Koordinat valid = boleh dipakai sebagai posisi penanda di peta.
const validCoords = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

interface Props {
  /** null = mode tambah, ada = mode ubah */
  entity: Entity | null
  /** Lokasi yang dipilih di peta (state ada di App agar peta ikut berubah). */
  draft: Coords | null
  onDraftChange: (c: Coords) => void
  onCancel: () => void
  onSaved: (e: Entity) => void
}

export default function EntityForm({ entity, draft, onDraftChange, onCancel, onSaved }: Props) {
  const create = useCreateEntity()
  const update = useUpdateEntity()

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntityInput>({
    resolver: zodResolver(entityInputSchema),
    defaultValues: entity
      ? {
          name: entity.name,
          type: entity.type,
          status: entity.status,
          description: entity.description,
          latitude: entity.latitude,
          longitude: entity.longitude,
        }
      : { name: '', type: 'vehicle', status: 'active', description: '' },
  })

  // Form -> peta: koordinat yang diketik menggeser penanda draft.
  const lat = watch('latitude')
  const lng = watch('longitude')
  useEffect(() => {
    if (validCoords(lat, lng) && (draft?.lat !== lat || draft?.lng !== lng)) {
      onDraftChange({ lat, lng })
    }
    // `draft` sengaja tidak masuk deps: arah sebaliknya ditangani effect di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // Peta -> form: klik peta / seret penanda mengisi input koordinat.
  useEffect(() => {
    if (!draft) return
    const opts = { shouldValidate: true, shouldDirty: true }
    if (getValues('latitude') !== draft.lat) setValue('latitude', draft.lat, opts)
    if (getValues('longitude') !== draft.lng) setValue('longitude', draft.lng, opts)
  }, [draft, getValues, setValue])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = entity
        ? await update.mutateAsync({ id: entity.id, input: values })
        : await create.mutateAsync(values)
      onSaved(saved)
    } catch (err) {
      // Validasi backend (422): tampilkan pesan di field yang sama dengan Zod.
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        for (const [field, message] of Object.entries(err.details)) {
          if (isField(field)) setError(field, { type: 'server', message })
        }
        return
      }
      setError('root.server', {
        message: err instanceof Error ? err.message : 'Gagal menyimpan, coba lagi.',
      })
    }
  })

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-base font-semibold">{entity ? 'Ubah entity' : 'Tambah entity'}</h1>
        <p className="text-xs text-gray-500">
          Klik peta untuk memilih lokasi, atau seret penanda biru.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex-1 space-y-3 overflow-y-auto p-4">
        <Field label="Nama" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} autoComplete="off" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipe" error={errors.type?.message}>
            <select {...register('type')} className={inputCls}>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')} className={inputCls}>
              {ENTITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" error={errors.latitude?.message}>
            <input
              type="number"
              step="any"
              {...register('latitude', { valueAsNumber: true })}
              className={inputCls}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude?.message}>
            <input
              type="number"
              step="any"
              {...register('longitude', { valueAsNumber: true })}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Deskripsi (opsional)" error={errors.description?.message}>
          <textarea {...register('description')} rows={3} className={inputCls} />
        </Field>

        {errors.root?.server?.message && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.server.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </aside>
  )
}
