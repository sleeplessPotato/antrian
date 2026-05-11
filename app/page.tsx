import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
      <div className="text-center text-white space-y-8">
        <div>
          <h1 className="text-4xl font-black">🏛️ BPOM Lubuklinggau</h1>
          <p className="text-blue-200 mt-2">Sistem Antrian Digital</p>
        </div>
        <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
          <Link href="/kiosk" className="block bg-white text-blue-900 font-bold py-4 px-8 rounded-2xl text-lg shadow-xl hover:bg-blue-50 transition">
            🎫 Kiosk Pengunjung
          </Link>
          <Link href="/display" className="block bg-white/20 text-white font-bold py-4 px-8 rounded-2xl text-lg border border-white/30 hover:bg-white/30 transition">
            📺 Layar Display
          </Link>
          <Link href="/dashboard" className="block bg-white/20 text-white font-bold py-4 px-8 rounded-2xl text-lg border border-white/30 hover:bg-white/30 transition">
            👨‍💼 Dashboard Petugas
          </Link>
        </div>
        <p className="text-blue-300 text-sm">Badan Pengawas Obat dan Makanan</p>
      </div>
    </div>
  );
}
