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
git clone https://github.com/sleeplessPotato/antrian antrian-bpom
cd antrian-bpom
```

### 2. Jalankan setup script (satu perintah)

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux / Mac:**
```bash
chmod +x setup.sh && ./setup.sh
```

Script ini otomatis menjalankan:
1. `npm install` — install semua dependensi
2. Buat `.env` dari `.env.example`
3. `npm run db:migrate` — buat database & terapkan skema
4. `npm run db:seed` — isi data awal (layanan, loket, akun)
5. Port forwarding 80 → 3000 (butuh Administrator/sudo)

> **Windows:** klik kanan PowerShell → *Run as Administrator*, lalu jalankan `.\setup.ps1`

### 3. Rename PC server (sekali saja)

Agar petugas bisa akses tanpa hafal IP:

1. Klik kanan **This PC → Properties → Rename this PC**
2. Ganti nama menjadi `antrian`
3. Restart PC

### 4. Jalankan server

```bash
npm run build
npm start
```

Akses dari semua perangkat di jaringan yang sama:

| URL | Halaman |
|---|---|
| `http://antrian/` | Kiosk |
| `http://antrian/display` | Display TV |
| `http://antrian/dashboard` | Petugas |

---

### Setup manual (opsional)

Jika ingin menjalankan langkah per langkah:

```bash
npm install
cp .env.example .env          # Linux/Mac
# copy .env.example .env      # Windows CMD
npm run db:migrate
npm run db:seed
npm run dev
```

Isi default `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="ganti-dengan-string-acak-yang-kuat"
NEXT_PUBLIC_APP_NAME="Antrian BPOM Lubuklinggau"
```

> Ganti `JWT_SECRET` dengan string acak yang kuat sebelum deploy ke produksi.

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
