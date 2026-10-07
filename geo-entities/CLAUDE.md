# CLAUDE.md — Geo Entities

Panduan untuk Claude Code (dan siapa pun yang membaca repo ini) agar bekerja konsisten.

## Ringkasan

Aplikasi untuk menampilkan dan mengelola *entity* bergeolokasi (kendaraan, perangkat IoT, fasilitas, dll.) di atas peta. Dibuat sebagai take-home test Software Developer.

Fitur wajib:
1. Entity tampil di map
2. Tambah, ubah, hapus entity
3. Lihat detail entity
4. Validasi input di **frontend dan backend**

## Stack

| Bagian | Teknologi |
|---|---|
| Backend | Go 1.22+, chi (router), pgx (PostgreSQL), go-playground/validator |
| Database | PostgreSQL 16 via Docker Compose |
| Frontend | React + Vite + TypeScript, TanStack Query, React Hook Form + Zod, Tailwind, Leaflet (react-leaflet) |

## Struktur repo

```
.
├── CLAUDE.md
├── README.md                 # cara run, alasan library, workflow AI, status fitur
├── docker-compose.yml        # PostgreSQL + init schema + seed
├── db/seed.sql               # data contoh (hanya dev)
├── backend/
│   ├── cmd/server/main.go    # wiring: config, DB pool, router, graceful shutdown
│   ├── internal/
│   │   ├── entity/           # model domain + tag validasi (Input)
│   │   ├── handler/          # HTTP handler, format error, helper JSON
│   │   └── repository/       # interface Repository + implementasi Postgres
│   └── migrations/           # SQL up/down
└── frontend/                 # React + TS
```

Alur dependensi: `handler -> repository (interface) -> entity`. `entity` tidak boleh import paket internal lain.

## Perintah

Jalankan dari Git Bash (Windows) di root repo.

```bash
docker compose up -d db                 # start PostgreSQL (schema + seed otomatis di start pertama)
docker compose down -v                  # reset DB total

cd backend
go mod tidy                             # pertama kali
go run ./cmd/server                     # API di http://localhost:8080
go test ./...
go vet ./...
gofmt -l .                              # harus kosong

# frontend: belum dibuat
```

## Kontrak API

| Method | Path | Sukses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | 200 | cek server + DB |
| GET | `/api/entities?type=&status=&q=` | 200 | array entity (bisa kosong `[]`) |
| GET | `/api/entities/{id}` | 200 | 404 jika tidak ada, 400 jika id bukan UUID |
| POST | `/api/entities` | 201 | header `Location` diisi |
| PUT | `/api/entities/{id}` | 200 | update penuh (semua field wajib) |
| DELETE | `/api/entities/{id}` | 204 | tanpa body |

Format error (seluruh endpoint):

```json
{ "error": "validation_failed", "message": "input tidak valid",
  "details": { "latitude": "tidak boleh lebih dari 90" } }
```

Kode `error`: `invalid_json` (400), `invalid_id` (400), `invalid_filter` (400), `validation_failed` (422), `not_found` (404), `internal_error` (500).

## Aturan validasi (sumber kebenaran)

| Field | Aturan |
|---|---|
| `name` | wajib, tidak boleh hanya spasi, maks 100 karakter |
| `type` | `vehicle` \| `iot_device` \| `facility` \| `other` |
| `status` | `active` \| `inactive` \| `maintenance` |
| `description` | opsional, maks 500 karakter |
| `latitude` | wajib, -90 s/d 90 (nilai `0` valid) |
| `longitude` | wajib, -180 s/d 180 (nilai `0` valid) |

Aturan ini ada di **tiga tempat** dan harus diubah bersamaan:
1. `backend/internal/entity/entity.go` (tag `validate`, method `Valid()`)
2. `backend/migrations/*.sql` (`CHECK` constraint)
3. Schema Zod di `frontend/`

## Konvensi kode

**Go**
- Format dengan `gofmt`; error dibungkus `fmt.Errorf("konteks: %w", err)`.
- Handler tipis: parse -> validasi -> panggil repository -> tulis response. Tidak ada SQL di handler.
- Semua response error lewat `writeError`; jangan menulis `http.Error` ad-hoc di handler entity.
- Koordinat bertipe `*float64` di `Input` agar `0` tidak dianggap kosong.
- Test handler pakai fake repository (tanpa DB), table-driven.

**TypeScript / React**
- `strict: true`; tanpa `any`.
- Data server lewat TanStack Query (satu hook per operasi); jangan `fetch` langsung di komponen.
- Tipe `Entity` dan schema Zod diselaraskan dengan tabel validasi di atas.
- Pesan error dari backend (`details`) ditampilkan di field form yang sesuai.

## Aturan kerja untuk AI

- Baca file yang relevan sebelum mengubah; jangan menebak bentuk API atau skema.
- Perubahan kecil dan fokus, satu concern per commit. **Jangan `git commit`/`push` kecuali diminta.**
- Jelaskan *kenapa* sebuah keputusan diambil, bukan hanya apa yang diubah.
- Logika non-trivial wajib punya test. Jangan mengubah/menghapus test supaya lulus; perbaiki kodenya.
- Jangan menambah dependency baru tanpa alasan; catat alasannya di README bagian "Alasan pemilihan library".
- Jangan menyimpan secret di repo; gunakan `.env.example`.
- Jangan menyatakan sesuatu "sudah jalan" sebelum benar-benar dijalankan/dites. Jika tidak bisa menjalankan, katakan terus terang.
- Fitur yang belum selesai ditulis di README bagian "Status fitur".

## Definition of done

- [ ] Semua requirement wajib berfungsi end-to-end (FE -> BE -> DB)
- [ ] Validasi bekerja di FE dan BE (dibuktikan test + coba manual)
- [ ] `go vet ./...`, `gofmt -l .`, dan `go test ./...` bersih
- [ ] Clone ke folder baru, ikuti README dari nol -> berjalan
- [ ] README: cara run, alasan library, workflow AI, status fitur
- [ ] Tidak ada secret yang ter-commit

## Log penggunaan AI (isi manual dan jujur)

Dipakai untuk bagian "Workflow Agentic AI" di README.

| Bagian | Dikerjakan/ditulis sendiri | Cara verifikasi | Koreksi yang saya lakukan |
|---|---|---|---|---|
| Skema DB + migrasi | dikerjakan dan dibantu AI | Verifikasi manual | 
| Backend: entity + repository | dikerjakan dan dibantu AI | Verifikasi manual | 
| Backend: handler | dikerjakan dan dibantu AI | Verifikasi manual | 
| Frontend: map + marker | Dikerjakan AI | Verifikasi manual | testing di frontend untuk semua fungsi nya
| Frontend: form + validasi | Dikerjakan AI | Verifikasi manual | testing di frontend untuk semua fungsi nya
| Docker + dokumentasi | Dikerjakan AI | Verifikasi manual | Ada beberapa koreksi
