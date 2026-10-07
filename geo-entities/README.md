# Geo Entities

Aplikasi web untuk menampilkan dan mengelola *entity* yang punya lokasi geografis (kendaraan, perangkat IoT, fasilitas, dll.) di atas peta. Dibuat sebagai take-home test Software Developer.

- **Frontend**: React + TypeScript (Vite), peta Leaflet + OpenStreetMap
- **Backend**: Go (chi), REST API
- **Database**: PostgreSQL 16

## Fitur

- Menampilkan semua entity sebagai marker di peta (warna marker mengikuti status)
- Melihat detail entity (klik marker atau item di daftar)
- Menambah entity: isi form, pilih lokasi dengan klik peta, atau seret penanda, atau ketik koordinat
- Mengubah entity (termasuk memindahkan lokasinya)
- Menghapus entity dengan dialog konfirmasi
- Validasi input di **frontend** (Zod) **dan backend** (go-playground/validator + `CHECK` constraint di database)

## Arsitektur

```mermaid
flowchart LR
    B[Browser<br/>React + Leaflet] -->|/api/*| N[nginx / Vite proxy]
    N --> G[Go API<br/>chi + validator]
    G --> P[(PostgreSQL)]
```

Browser selalu memanggil `/api/...` di origin yang sama (proxy Vite saat development, nginx di Docker), sehingga tidak ada masalah CORS.

Backend dibagi tiga lapisan: `handler` (HTTP, validasi) → `repository` (interface + implementasi Postgres) → `entity` (model dan aturan validasi). Handler hanya bergantung pada interface `Repository`, sehingga bisa diuji tanpa database.

## Cara menjalankan

### Opsi A: Docker (disarankan)

Prasyarat: Docker Desktop (atau Docker Engine + Compose v2) yang sedang berjalan.

```bash
docker compose up --build
```

| Layanan | URL |
|---|---|
| Aplikasi | http://localhost:3000 |
| API | http://localhost:8080/api/entities |
| PostgreSQL (dari host) | `localhost:5433`, user/password/db: `geo` |

Saat pertama kali jalan, schema dibuat otomatis dan 8 data contoh dimasukkan. Menghentikan: `Ctrl+C` (atau `docker compose down`). Reset total termasuk data: `docker compose down -v`.

Catatan: peta memerlukan koneksi internet untuk mengunduh tile OpenStreetMap.

### Opsi B: Development lokal

Prasyarat: Go 1.22+, Node.js 20.19+ (atau 22.12+), Docker (hanya untuk database).

```bash
# 1. Database
docker compose up -d db

# 2. Backend  (terminal 1)  ->  http://localhost:8080
cd backend
go mod download
go run ./cmd/server

# 3. Frontend (terminal 2)  ->  http://localhost:5173
cd frontend
npm install
npm run dev
```

Backend membaca konfigurasi dari environment variable (semua punya default, lihat `.env.example`):

| Variabel | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgres://geo:geo@localhost:5433/geo?sslmode=disable` | koneksi PostgreSQL |
| `PORT` | `8080` | port API |
| `CORS_ORIGINS` | `http://localhost:5173` | daftar origin, dipisah koma |

Jangan menjalankan Opsi A dan B bersamaan: keduanya memakai port 8080.

### Menjalankan test

```bash
cd backend
go vet ./...
go test ./...
```

Test mencakup lapisan HTTP (validasi, kode status, pemetaan error) memakai fake repository. Lihat bagian *Keterbatasan* untuk apa yang belum diuji otomatis.

## API

| Method | Path | Sukses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | 200 | cek server dan database |
| GET | `/api/entities?type=&status=&q=` | 200 | daftar entity; filter opsional |
| GET | `/api/entities/{id}` | 200 | detail; 404 jika tidak ada |
| POST | `/api/entities` | 201 | header `Location` diisi |
| PUT | `/api/entities/{id}` | 200 | update **penuh**: semua field wajib dikirim |
| DELETE | `/api/entities/{id}` | 204 | tanpa body |

Contoh body `POST` / `PUT`:

```json
{
  "name": "Truk Logistik B-1021",
  "type": "vehicle",
  "status": "active",
  "description": "Rute Bandung - Jakarta",
  "latitude": -6.9175,
  "longitude": 107.6191
}
```

Format error (semua endpoint):

```json
{
  "error": "validation_failed",
  "message": "input tidak valid",
  "details": { "latitude": "tidak boleh lebih dari 90" }
}
```

| `error` | HTTP | Arti |
|---|---|---|
| `invalid_json` | 400 | body bukan JSON valid, ada field asing, atau tipe salah |
| `invalid_id` / `invalid_filter` | 400 | id bukan UUID / nilai filter tidak dikenal |
| `validation_failed` | 422 | gagal validasi; `details` berisi pesan per field |
| `not_found` | 404 | entity tidak ada |
| `internal_error` | 500 | kesalahan server (detail hanya di log) |

## Aturan validasi

| Field | Aturan |
|---|---|
| `name` | wajib, tidak boleh hanya spasi, maks 100 karakter |
| `type` | `vehicle` \| `iot_device` \| `facility` \| `other` |
| `status` | `active` \| `inactive` \| `maintenance` |
| `description` | opsional, maks 500 karakter |
| `latitude` | wajib, -90 sampai 90 |
| `longitude` | wajib, -180 sampai 180 |

Aturan yang sama diterapkan di tiga lapis: Zod di frontend (`frontend/src/lib/schema.ts`), validator di backend (`backend/internal/entity/entity.go`), dan `CHECK` constraint di database (`backend/migrations/`). Frontend memberi umpan balik cepat; backend adalah penjaga yang sebenarnya; database sebagai jaring pengaman terakhir. Jika backend menolak data (422), pesannya ditampilkan di field form yang bersangkutan.

## Struktur repo

```
.
├── CLAUDE.md                 # konteks proyek untuk asisten AI
├── docker-compose.yml        # db + backend + frontend
├── db/seed.sql               # data contoh
├── backend/
│   ├── Dockerfile
│   ├── cmd/server/           # entry point, wiring, graceful shutdown
│   ├── internal/
│   │   ├── entity/           # model + aturan validasi
│   │   ├── handler/          # HTTP handler + test
│   │   └── repository/       # interface + implementasi Postgres
│   └── migrations/           # SQL up/down
└── frontend/
    ├── Dockerfile, nginx.conf
    └── src/
        ├── components/       # EntityMap, EntitySidebar, EntityForm, ConfirmDialog
        ├── hooks/            # hook TanStack Query
        ├── lib/              # api client, schema Zod, ikon marker
        └── types/
```

## Alasan pemilihan library

### Backend

| Library | Alasan |
|---|---|
| **chi** | Router ringan yang kompatibel penuh dengan `net/http` standar (handler tetap `http.HandlerFunc`), mendukung sub-router dan middleware. Gin atau Echo lebih "berisi", tetapi untuk 6 endpoint itu berlebihan dan mengikat handler ke tipe context sendiri. |
| **pgx v5** | Driver PostgreSQL native untuk Go yang dirawat aktif, dengan connection pool bawaan (`pgxpool`). Memakai SQL langsung membuat query terlihat jelas, tanpa lapisan ORM untuk satu tabel. |
| **go-playground/validator** | Standar de facto validasi struct di Go; aturan ditulis deklaratif lewat tag, bisa ditambah validator kustom (dipakai agar daftar enum hanya didefinisikan sekali). |
| **google/uuid** | Mem-parse dan memvalidasi `id` dari URL sebelum menyentuh database. |
| **go-chi/cors** | Middleware CORS yang dikonfigurasi lewat environment variable untuk development dengan origin berbeda. |
| **PostgreSQL** | Relasional dengan `CHECK` constraint yang menjadi lapisan validasi terakhir, dan jalur mulus ke PostGIS jika nanti butuh query spasial. Untuk saat ini koordinat cukup disimpan sebagai dua kolom `double precision`. |

### Frontend

| Library | Alasan |
|---|---|
| **React + Vite + TypeScript** | Sesuai ketentuan soal. Vite dipilih ketimbang Next.js karena aplikasi ini murni SPA yang bicara ke API terpisah: tidak butuh SSR/routing server, build lebih cepat, hasilnya statis dan mudah disajikan nginx. |
| **Leaflet + react-leaflet** | Open source, tanpa API key atau akun (penilai bisa langsung menjalankan), dokumentasi dan contoh melimpah, dan cukup untuk marker, klik peta, serta drag. MapLibre GL lebih kuat untuk peta vektor/3D, tetapi kebutuhan di sini tidak sampai ke sana. |
| **OpenStreetMap tiles** | Gratis dan tanpa key. Untuk produksi dengan trafik nyata perlu penyedia tile sendiri (kebijakan penggunaan OSM). |
| **TanStack Query** | Mengurus cache, status loading/error, dan sinkronisasi server state. Setelah tambah/ubah/hapus cukup meng-invalidate query `entities` dan peta serta daftar ikut menyegarkan, tanpa store global buatan sendiri. |
| **React Hook Form + Zod** | RHF meminimalkan re-render pada form; Zod memberi schema yang sekaligus menjadi tipe TypeScript (`z.infer`), dan terhubung lewat `@hookform/resolvers`. |
| **Tailwind CSS** | Styling cepat dan konsisten tanpa berpindah file; cukup untuk antarmuka sederhana ini. |
| **nginx** (hanya di Docker) | Menyajikan build statis dan meneruskan `/api` ke backend, meniru perilaku proxy Vite saat development. |

## Keputusan desain

- **`PUT` = update penuh.** Semua field wajib; body parsial ditolak dengan 422. Lebih sederhana dan tidak ambigu dibanding `PATCH`; ada test yang mengunci perilaku ini.
- **Latitude/longitude bertipe pointer (`*float64`) di input backend**, agar koordinat `0` (valid) bisa dibedakan dari field yang tidak dikirim.
- **Status 422 untuk kegagalan validasi, 400 untuk request yang rusak** (JSON tidak valid, field asing, id bukan UUID).
- **Daftar enum didefinisikan sekali di backend** (`entity.Type.Valid()`), dipakai oleh validator dan filter query.
- **Schema database dibuat lewat skrip init Postgres** (`docker-entrypoint-initdb.d`), bukan migration runner, supaya `docker compose up` tidak butuh langkah tambahan. Konsekuensinya dicatat di *Keterbatasan*.
- **Koordinat hasil klik peta dibulatkan ke 6 desimal (≈10 cm) dan dinormalisasi** ke rentang -180..180 (peta Leaflet bisa digeser melewati batas dunia).

## Status fitur

| Requirement | Status |
|---|---|
| Menampilkan entity di map | ✅ |
| Menambah entity | ✅ |
| Mengubah entity | ✅ |
| Menghapus entity | ✅ |
| Melihat detail entity | ✅ |
| Validasi di frontend | ✅ Zod, pesan per field |
| Validasi di backend | ✅ validator + `CHECK` di database |
| Docker Compose (satu perintah) | ✅ |

### Keterbatasan dan yang belum dikerjakan

- **Filter/pencarian belum ada di UI.** API sudah mendukung `?type=&status=&q=`, tetapi antarmukanya belum dibuat.
- **Tidak ada pagination** dan **tidak ada clustering marker**. Semua entity dimuat sekaligus; nyaman untuk puluhan sampai ratusan data, tidak untuk puluhan ribu. Jalur peningkatan: query berdasarkan bounding box viewport + clustering.
- **Test otomatis hanya untuk lapisan HTTP backend.** Belum ada test integrasi untuk repository (query SQL ke Postgres sungguhan) dan belum ada test frontend di repo. Query SQL dan alur UI diverifikasi secara manual.
- **Migrasi tidak berversi.** Skrip schema hanya dijalankan saat volume database masih kosong; perubahan schema di masa depan butuh migration runner (mis. golang-migrate).
- **Tidak ada autentikasi/otorisasi** dan tidak ada pembaruan realtime. Untuk perangkat IoT yang posisinya berubah terus, langkah berikutnya adalah WebSocket/SSE.
- **Tile peta bergantung pada internet** (OpenStreetMap).
- Konfigurasi Docker memakai kredensial database sederhana (`geo/geo`) untuk keperluan demo; jangan dipakai apa adanya di produksi.

## Penggunaan Agentic AI

### Alat dan sejauh mana

- Saya memakai **Claude** lewat aplikasi chat sebagai asisten selama pengerjaan: perencanaan, pembuatan kerangka (scaffolding), dan penulisan draf kode serta dokumentasi.
- Asisten **tidak** mengakses repo atau menjalankan perintah di mesin saya; semua kode dipindahkan, dijalankan, dan diverifikasi oleh saya sendiri.
- File `CLAUDE.md` di root repo berisi konteks proyek, kontrak API, aturan validasi, konvensi kode, dan aturan kerja untuk AI. File ini dibuat di awal dan dipakai sebagai acuan selama pengerjaan.

### Pembagian kerja

| Bagian | Dibantu AI | Dikerjakan / diputuskan sendiri | Cara verifikasi |
|---|---|---|---|
| Rencana, pilihan stack, desain data & API | Brainstorming dan usulan | Ditelaah sebelum dipakai |
| Skema database + seed | Draf SQL | Menjalankan dan memeriksa hasilnya | `GET /api/entities` menampilkan data seed |
| Backend: model, repository, handler List/Get/Create | Draf kode + unit test | Menjalankan, membaca, dan memahami kode | `go vet`, `go test`, uji manual dengan curl |
| Backend: handler Update/Delete | Test-nya disediakan lebih dulu | Di implementasi oleh saya | Test hijau + uji manual PUT/DELETE/GET 404 ke database sungguhan |
| Frontend: tipe, schema Zod, API client, hooks | Draf kode | Membuat scaffold Vite, memasang dan menjalankan | Build dan lint bersih, data tampil di browser |
| Frontend: peta, daftar, form, dialog hapus | Draf kode  | Uji manual di browser untuk skenario tambah/ubah/hapus/validasi |
| Docker + README | Draf  | `docker compose up --build` dari clone bersih |

### Cara memverifikasi keluaran AI

- Setiap bagian backend dijalankan dan diuji (unit test dan curl) sebelum frontend dibangun di atasnya.
- Test ditulis sebelum implementasi untuk handler Update/Delete (merah dulu, lalu hijau).
- Keputusan desain di atas (mis. `PUT` penuh, pointer untuk koordinat) saya baca dan pahami alasannya sebelum dipakai.

### Contoh hal yang perlu dikoreksi

- **Port database bentrok.** Konfigurasi awal memakai port host 5432, tetapi di mesin saya sudah ada PostgreSQL lokal sehingga backend gagal login ke "database" yang salah. Saya mendiagnosis dengan memeriksa port yang aktif, lalu memindahkan port host container ke 5433.
- **Quoting JSON di PowerShell.** Perintah curl contoh tidak langsung bekerja di PowerShell; body JSON saya pindahkan ke file.
