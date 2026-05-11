"use client";
import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import { announceQueue, unlockAudio, speakTTS, awaitVoices, setPreferredVoice, getPreferredVoiceURI } from "@/lib/voice";
import { RunningText } from "@/components/display/RunningText";
import { format } from "date-fns";

interface QueueItem {
  id: number;
  formattedNumber: string;
  prefix: string;
  number: number;
  queueType: string;
  status: string;
  counter?: { id: number; name: string } | null;
  service?: { name: string; nameEn: string } | null;
}

interface DisplayData {
  called:      QueueItem[];
  serving:     QueueItem[];
  waiting:     QueueItem[];
  recentDone:  QueueItem[];
  totalWaiting: number;
  totalServed:  number;
}

interface Announcement {
  id: number;
  text: string;
  textEn: string;
}

/* ─── Card: dipanggil (kuning) ─── */
function CalledCard({ item }: { item: QueueItem }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 min-h-44 border-4 border-yellow-400">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
        {item.counter?.name ?? "Loket"}
      </p>
      <p className="text-7xl font-black text-blue-700 leading-none">{item.formattedNumber}</p>
      <p className="text-gray-500 text-sm mt-2">{item.service?.name}</p>
      {item.queueType === "disability" && (
        <span className="mt-2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">♿ Prioritas</span>
      )}
      <span className="mt-2 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-semibold">
        🔔 Dipanggil
      </span>
    </div>
  );
}

/* ─── Card: dilayani (hijau) ─── */
function ServingCard({ item }: { item: QueueItem }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 min-h-44 border-4 border-green-400">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
        {item.counter?.name ?? "Loket"}
      </p>
      <p className="text-7xl font-black text-green-700 leading-none">{item.formattedNumber}</p>
      <p className="text-gray-500 text-sm mt-2">{item.service?.name}</p>
      {item.queueType === "disability" && (
        <span className="mt-2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">♿ Prioritas</span>
      )}
      <span className="mt-2 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-semibold">
        ✋ Sedang Dilayani
      </span>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="bg-white/10 rounded-2xl flex flex-col items-center justify-center min-h-44 border-2 border-white/20">
      <p className="text-white/30 text-2xl">—</p>
      <p className="text-white/20 text-sm mt-1">{label}</p>
    </div>
  );
}

function DoneRow({ item }: { item: QueueItem }) {
  return (
    <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
      <span className="font-black text-white/60 text-xl w-20">{item.formattedNumber}</span>
      <span className="text-white/50 text-sm flex-1 ml-3 truncate">{item.service?.name}</span>
      <span className="text-white/40 text-sm">{item.counter?.name ?? "-"}</span>
      <span className="ml-3 text-green-400/70 text-xs">✓ Selesai</span>
    </div>
  );
}

export default function DisplayPage() {
  const [data, setData] = useState<DisplayData>({
    called: [], serving: [], waiting: [], recentDone: [], totalWaiting: 0, totalServed: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voiceType, setVoiceType] = useState<"tts" | "audio" | "both">("tts");
  const [locale] = useState<"id" | "en">("id");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedURI, setSelectedURI] = useState<string>("");

  const handleUnlockAudio = () => {
    unlockAudio();
    setAudioUnlocked(true);
    // Load voice list after unlock (voiceschanged may not have fired yet)
    awaitVoices().then((list) => {
      setVoices(list);
      setSelectedURI(getPreferredVoiceURI() ?? "");
    });
  };

  const handleSelectVoice = (uri: string) => {
    setPreferredVoice(uri);
    setSelectedURI(uri);
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) speakTTS("Nomor antrian A satu, silakan menuju Loket satu.", v.lang);
  };

  const fetchData = useCallback(async () => {
    const [dataRes, annRes, settingsRes] = await Promise.all([
      fetch("/api/queue/current"),
      fetch("/api/announcements"),
      fetch("/api/settings"),
    ]);
    const [d, a, s] = await Promise.all([dataRes.json(), annRes.json(), settingsRes.json()]);
    setData(d);
    setAnnouncements(a);
    if (s.voice_type) setVoiceType(s.voice_type);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:display");

    socket.on("queue:called", (q: QueueItem) => {
      setData((prev) => ({
        ...prev,
        called:  [q, ...prev.called.filter((c) => c.id !== q.id)].slice(0, 6),
        serving: prev.serving.filter((s) => s.id !== q.id),
        waiting: prev.waiting.filter((w) => w.id !== q.id),
      }));
      announceQueue(q.formattedNumber, q.counter?.name ?? "Loket", voiceType, locale);
      fetchData();
    });

    socket.on("queue:recalled", (q: QueueItem) => {
      announceQueue(q.formattedNumber, q.counter?.name ?? "Loket", voiceType, locale);
    });

    socket.on("queue:serving", (q: QueueItem) => {
      setData((prev) => ({
        ...prev,
        serving: [q, ...prev.serving.filter((s) => s.id !== q.id)].slice(0, 6),
        called:  prev.called.filter((c) => c.id !== q.id),
      }));
      fetchData();
    });

    socket.on("queue:done",     fetchData);
    socket.on("queue:skipped",  fetchData);
    socket.on("queue:requeued", fetchData);
    socket.on("queue:reset",    fetchData);
    socket.on("queue:new",      fetchData);

    return () => {
      socket.off("queue:called");
      socket.off("queue:recalled");
      socket.off("queue:serving");
      socket.off("queue:done");
      socket.off("queue:skipped");
      socket.off("queue:requeued");
      socket.off("queue:reset");
      socket.off("queue:new");
    };
  }, [voiceType, locale, fetchData]);

  const nextQueue = data.waiting[0] ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col text-white">

      {/* Header */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-white/20">
        <div>
          <h1 className="text-3xl font-black tracking-wide">BPOM LUBUKLINGGAU</h1>
          <p className="text-blue-300 text-sm">Sistem Antrian Digital</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold" suppressHydrationWarning>
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-blue-300 text-sm" suppressHydrationWarning>
            {format(currentTime, "EEEE, dd MMMM yyyy")}
          </p>
        </div>
      </header>

      {/* Running text */}
      <RunningText announcements={announcements} locale={locale} />

      {/* Main layout */}
      <main className="flex-1 grid grid-cols-3 gap-6 p-6">

        {/* LEFT: Dipanggil + Dilayani + Selesai */}
        <div className="col-span-2 flex flex-col gap-5">

          {/* Section: Dipanggil */}
          <div>
            <h2 className="text-sm font-bold text-yellow-300 uppercase tracking-widest mb-3">
              🔔 Dipanggil
            </h2>
            {data.called.length > 0 ? (
              <div className={`grid gap-3 ${data.called.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {data.called.map((q) => <CalledCard key={q.id} item={q} />)}
              </div>
            ) : (
              <EmptySlot label="Belum ada panggilan" />
            )}
          </div>

          {/* Section: Sedang Dilayani */}
          {data.serving.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-green-300 uppercase tracking-widest mb-3">
                ✋ Sedang Dilayani
              </h2>
              <div className={`grid gap-3 ${data.serving.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {data.serving.map((q) => <ServingCard key={q.id} item={q} />)}
              </div>
            </div>
          )}

          {/* Section: Selesai */}
          {data.recentDone.length > 0 && (
            <div className="mt-auto">
              <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">
                ✓ Terakhir Selesai
              </h2>
              <div className="space-y-2">
                {data.recentDone.slice(0, 4).map((q) => (
                  <DoneRow key={q.id} item={q} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Berikutnya + Stats + Waiting list */}
        <div className="flex flex-col gap-4">

          <div>
            <h2 className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-3">
              ⏭ Berikutnya
            </h2>
            {nextQueue ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Nomor Berikutnya</p>
                <p className="text-5xl font-black text-blue-600">{nextQueue.formattedNumber}</p>
                <p className="text-gray-400 text-sm mt-2">{nextQueue.service?.name}</p>
              </div>
            ) : (
              <div className="bg-white/10 rounded-2xl p-6 text-center">
                <p className="text-white/30">—</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-yellow-300 text-xs uppercase tracking-wide mb-1">Menunggu</p>
              <p className="text-4xl font-black text-yellow-400">{data.totalWaiting}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-green-300 text-xs uppercase tracking-wide mb-1">Dilayani</p>
              <p className="text-4xl font-black text-green-400">{data.totalServed}</p>
            </div>
          </div>

          {data.waiting.slice(1).length > 0 && (
            <div className="bg-white/10 rounded-xl p-4 flex-1">
              <p className="text-blue-200 text-xs uppercase tracking-widest mb-3">Antrian Menunggu</p>
              <div className="space-y-2">
                {data.waiting.slice(1, 6).map((q) => (
                  <div key={q.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="font-bold text-white">{q.formattedNumber}</span>
                    <span className="text-blue-200 text-xs truncate ml-2">{q.service?.name}</span>
                    {q.queueType === "disability" && <span className="text-purple-300 ml-1 text-xs">♿</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-blue-400 text-xs py-2 border-t border-white/10">
        Badan Pengawas Obat dan Makanan &bull; Kota Lubuklinggau
      </footer>

      {/* Audio unlock overlay */}
      {!audioUnlocked && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 cursor-pointer"
          onClick={handleUnlockAudio}
        >
          <div className="bg-white rounded-2xl px-10 py-8 text-center shadow-2xl max-w-sm">
            <p className="text-5xl mb-4">🔊</p>
            <p className="text-xl font-black text-gray-800 mb-2">Aktifkan Suara</p>
            <p className="text-gray-500 text-sm">
              Klik di mana saja untuk mengaktifkan pengumuman suara antrian
            </p>
          </div>
        </div>
      )}

      {/* Voice picker — bottom-right corner, visible after unlock */}
      {audioUnlocked && (
        <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2">
          <button
            onClick={() => setShowVoicePicker((v) => !v)}
            className="bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-full border border-white/20 transition-colors"
          >
            🔊 Pilih Suara
          </button>

          {showVoicePicker && (
            <div className="bg-gray-900/95 border border-white/20 rounded-2xl p-4 w-80 max-h-96 overflow-y-auto shadow-2xl">
              <p className="text-white font-bold text-sm mb-3">Pilih Suara Pengumuman</p>
              <div className="space-y-1">
                {voices.map((v) => (
                  <button
                    key={v.voiceURI}
                    onClick={() => handleSelectVoice(v.voiceURI)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start gap-2 ${
                      selectedURI === v.voiceURI
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 hover:bg-white/15 text-white/80"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {selectedURI === v.voiceURI ? "✓" : "○"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{v.name}</span>
                      <span className="block text-white/50">{v.lang}</span>
                    </span>
                  </button>
                ))}
                {voices.length === 0 && (
                  <p className="text-white/40 text-xs text-center py-4">Memuat daftar suara...</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
