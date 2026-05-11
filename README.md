# Antrian BPOM Lubuklinggau

Sistem antrian digital berbasis web untuk BPOM Lubuklinggau. Fitur: kiosk cetak nomor antrian, cetak tiket ke printer thermal (Bluetooth/Serial), display board realtime dengan slideshow iklan, dashboard petugas, panel admin dengan manajemen layanan/loket/iklan, dan pengumuman suara bilingual (ID + EN).

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

### 3. Build aplikasi

```bash
npm run build
```

### 5. Jalankan otomatis saat PC menyala (Windows Service)

```powershell
# Klik kanan PowerShell → Run as administrator
.\install-service.ps1
```

Script ini mengunduh NSSM, mendaftarkan aplikasi sebagai Windows Service, dan langsung menjalankannya. Setelah ini, aplikasi hidup otomatis setiap kali PC menyala — tanpa perlu login atau ketik perintah apapun.

> Untuk menghapus service: `.\uninstall-service.ps1` (sebagai Administrator)

### Atau: jalankan manual (development / testing)

```bash
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
| `/` | Kiosk — ambil nomor antrian + cetak tiket | Pengunjung |
| `/display` | Papan antrian realtime + suara + slideshow iklan | TV/Monitor publik |
| `/dashboard` | Panel petugas — panggil & layani antrian | Petugas |
| `/dashboard` (tab Admin) | Kelola petugas, layanan, loket, pengumuman, iklan, backup, pengaturan | Admin |
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

## Printer Thermal

Tiket dicetak otomatis setelah pengunjung mengisi data. Didukung dua mode:

| Mode | Cara Kerja |
|---|---|
| **Serial (ESC/POS)** | Via [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) — koneksi Bluetooth atau USB ke printer thermal |
| **Browser print** | Fallback otomatis jika Serial tidak tersedia — buka jendela print browser |

**Setup printer Bluetooth (sekali saja):**
1. Pasangkan printer ke PC via Bluetooth (Settings → Bluetooth → Add device)
2. Buka halaman kiosk di browser Chrome/Edge
3. Pertama kali print → browser meminta izin memilih port → pilih printer
4. Print selanjutnya langsung tanpa picker

> Web Serial API hanya tersedia di Chrome dan Edge. Firefox tidak didukung.

---

## Backup & Restore

Database dicadangkan secara otomatis dan dapat dipulihkan melalui panel admin (tab **Admin → Backup**).

| Fitur | Keterangan |
|---|---|
| **Backup manual** | Download file `.db` langsung dari browser |
| **Backup otomatis** | Berjalan 30 detik setelah server nyala, lalu setiap 24 jam |
| **Retensi** | Maksimal 7 file tersimpan di `backups/` — yang terlama dihapus otomatis |
| **Restore dari backup tersimpan** | Pilih file dari daftar → konfirmasi → restore langsung tanpa restart server |
| **Restore dari file eksternal** | Upload file `.db` dari perangkat lain |
| **Safety backup** | Backup kondisi saat ini dibuat otomatis sebelum setiap restore |

> Folder `backups/` tidak ikut ter-commit ke git (sudah ada di `.gitignore`). Salin folder tersebut secara manual jika ingin memindahkan backup ke tempat lain.

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
│   ├── dashboard/    # Halaman dashboard petugas & admin
│   ├── display/      # Papan antrian publik + slideshow
│   ├── kiosk/        # Halaman kiosk tablet
│   └── page.tsx      # Kiosk utama
├── components/
│   ├── admin/        # Panel admin (petugas, layanan, loket, iklan, dll)
│   ├── dashboard/    # Komponen dashboard petugas
│   ├── display/      # Komponen papan antrian
│   ├── kiosk/        # Komponen form kiosk
│   └── ui/           # Komponen shadcn/ui
├── lib/              # Utilitas (db, auth, socket, voice, printer, backup, queue-utils)
├── public/
│   └── ads/          # File iklan yang diupload (jpg/png/pdf) — gitignored
├── backups/          # File backup database otomatis (.db) — gitignored
├── logs/             # Log output service Windows — gitignored
├── tools/            # NSSM binary (diunduh otomatis) — gitignored
├── scripts/          # Script utilitas (test-backup.ts, test-restore.ts)
├── prisma/
│   ├── schema.prisma # Skema database
│   ├── seed.ts       # Script seed
│   └── migrations/   # Riwayat migrasi
├── server.ts         # Custom HTTP + Socket.io server
└── prisma.config.ts  # Konfigurasi Prisma CLI
```
