# Antrian BPOM Lubuklinggau

Sistem antrian digital berbasis web untuk BPOM Lubuklinggau. Fitur: kiosk cetak nomor, display board realtime, dashboard petugas, pengumuman suara bilingual (ID + EN).

---

## Tech Stack

| Layer | Library/Tool | Versi |
|---|---|---|
| Framework | [Next.js](https://nextjs.org/) | 16.2 |
| UI Runtime | React | 19 |
| Styling | Tailwind CSS | 4 |
| Komponen UI | shadcn/ui + Radix | latest |
| Realtime | Socket.io | 4.8 |
| Database | SQLite (via better-sqlite3) | embedded |
| ORM | Prisma | 7 |
| Auth | JWT + bcryptjs | — |
| Tanggal | date-fns | 4 |
| PDF/Excel | jsPDF + xlsx | — |
| Server | Node.js custom HTTP + Socket.io | — |
| Runtime CLI | tsx | 4 |
| Language | TypeScript | 5 |

---

## Prasyarat

- **Node.js** ≥ 20 — [download](https://nodejs.org/)
- **npm** ≥ 10 (bundled bersama Node.js)
- Tidak perlu database server — SQLite sudah embedded

---

## Instalasi

### 1. Clone repository

```bash
git clone <url-repo> antrian-bpom
cd antrian-bpom
```

### 2. Install dependensi

```bash
npm install
```

### 3. Buat file `.env`

Salin dari contoh lalu sesuaikan jika perlu:

```bash
cp .env.example .env
```

Isi default `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="antrian-bpom-lubuklinggau-secret-2024"
NEXT_PUBLIC_APP_NAME="Antrian BPOM Lubuklinggau"
```

> Ganti `JWT_SECRET` dengan string acak yang kuat sebelum deploy ke produksi.

### 4. Jalankan migrasi database

```bash
npm run db:migrate
```

Perintah ini membuat file `prisma/dev.db` dan menerapkan semua skema tabel.

### 5. Seed data awal

```bash
npm run db:seed
```

Akan membuat:
- 5 layanan (Konsultasi Produk, Pengambilan Dokumen, dll.)
- 3 loket (Loket 1–3)
- Akun admin dan petugas
- Pengumuman default

### 6. Jalankan server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Server berjalan di `http://localhost:3000`

---

## Halaman

| URL | Fungsi | Pengguna |
|---|---|---|
| `/` | Kiosk — ambil nomor antrian | Pengunjung |
| `/display` | Papan antrian realtime + suara | TV/Monitor publik |
| `/dashboard` | Panel petugas — panggil & layani | Petugas/Admin |
| `/kiosk` | Alternatif kiosk tablet | Pengunjung |

---

## Akun Default (setelah seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Petugas | `petugas1` | `petugas123` |

> Ganti password default sebelum digunakan di lingkungan produksi.

---

## Script NPM

```bash
npm run dev          # Jalankan server development
npm run build        # Build untuk produksi
npm start            # Jalankan server produksi
npm run db:migrate   # Migrasi + generate Prisma client
npm run db:seed      # Isi data awal (layanan, loket, akun)
npm run db:studio    # Buka Prisma Studio (GUI database)
npm run clean        # Hapus folder .next
```

---

## Fitur Suara (Display Board)

- Pengumuman bilingual otomatis: **Indonesia lalu Inggris**
- Nomor tiket dieja per digit: `B006` → *"B, Nol, Nol, Enam"* / *"B, Zero, Zero, Six"*
- Default voice: Microsoft Ardi Online (Natural) — Indonesian
- Voice picker tersedia di sudut kanan bawah layar display
- Preferensi suara tersimpan di `localStorage` browser

---

## Struktur Direktori

```
.
├── app/
│   ├── api/          # Route API (Next.js App Router)
│   ├── dashboard/    # Halaman dashboard petugas
│   ├── display/      # Papan antrian publik
│   ├── kiosk/        # Halaman kiosk
│   └── page.tsx      # Kiosk utama
├── components/       # Komponen React (ui/, dashboard/, display/)
├── lib/              # Utilitas (db, auth, socket, voice, queue-utils)
├── prisma/
│   ├── schema.prisma # Skema database
│   ├── seed.ts       # Script seed
│   └── migrations/   # Riwayat migrasi
├── server.ts         # Custom HTTP + Socket.io server
└── prisma.config.ts  # Konfigurasi Prisma CLI
```
