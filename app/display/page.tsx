"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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

interface Ad {
  id: number;
  filename: string;
  type: string;
  originalName: string;
}

function AdSlideshow({ ads }: { ads: Ad[] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % ads.length), 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/30">
      {ads.map((ad, i) => (
        <div
          key={ad.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {ad.type === "image" ? (
            <img src={`/ads/${ad.filename}`} alt={ad.originalName} className="w-full h-full object-contain" />
          ) : (
            <iframe src={`/ads/${ad.filename}`} className="w-full h-full border-0" title={ad.originalName} />
          )}
        </div>
      ))}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Card: dipanggil (kuning) ─── */
function CalledCard({ item }: { item: QueueItem }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-4 min-h-36 border-4 border-yellow-400">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
        {item.counter?.name ?? "Loket"}
      </p>
      <p className="text-6xl font-black text-blue-700 leading-none">{item.formattedNumber}</p>
      <p className="text-gray-500 text-xs mt-1.5">{item.service?.name}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
        {item.queueType === "disability" && (
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">♿ Prioritas</span>
        )}
        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">
          🔔 Dipanggil
        </span>
      </div>
    </div>
  );
}

/* ─── Card: dilayani (hijau) ─── */
function ServingCard({ item }: { item: QueueItem }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-4 min-h-36 border-4 border-green-400">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
        {item.counter?.name ?? "Loket"}
      </p>
      <p className="text-6xl font-black text-green-700 leading-none">{item.formattedNumber}</p>
      <p className="text-gray-500 text-xs mt-1.5">{item.service?.name}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
        {item.queueType === "disability" && (
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">♿ Prioritas</span>
        )}
        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
          ✋ Sedang Dilayani
        </span>
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="bg-white/10 rounded-2xl flex flex-col items-center justify-center min-h-36 border-2 border-white/20">
      <p className="text-white/30 text-2xl">—</p>
      <p className="text-white/20 text-sm mt-1">{label}</p>
    </div>
  );
}

export default function DisplayPage() {
  const [data, setData] = useState<DisplayData>({
    called: [], serving: [], waiting: [], recentDone: [], totalWaiting: 0, totalServed: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
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

  const fetchContent = useCallback(async () => {
    try {
      const [annRes, adsRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/ads"),
      ]);
      if (annRes.ok) setAnnouncements(await annRes.json());
      if (adsRes.ok) setAds(await adsRes.json());
    } catch { /* silent — retry on next poll */ }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, annRes, settingsRes, adsRes] = await Promise.all([
        fetch("/api/queue/current"),
        fetch("/api/announcements"),
        fetch("/api/settings"),
        fetch("/api/ads"),
      ]);
      if (dataRes.ok)    setData(await dataRes.json());
      if (annRes.ok)     setAnnouncements(await annRes.json());
      if (adsRes.ok)     setAds(await adsRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.voice_type) setVoiceType(s.voice_type);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchData();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    const contentPoll = setInterval(fetchContent, 60_000);
    return () => { clearInterval(clock); clearInterval(contentPoll); };
  }, [fetchData, fetchContent]);

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
    socket.on("content:updated", fetchContent);

    return () => {
      socket.off("queue:called");
      socket.off("queue:recalled");
      socket.off("queue:serving");
      socket.off("queue:done");
      socket.off("queue:skipped");
      socket.off("queue:requeued");
      socket.off("queue:reset");
      socket.off("queue:new");
      socket.off("content:updated");
    };
  }, [voiceType, locale, fetchData, fetchContent]);

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
      <main className="flex-1 grid grid-cols-3 gap-5 px-6 pt-4 pb-4 min-h-0">

        {/* LEFT: Dipanggil + Dilayani + Daftar Menunggu */}
        <div className="col-span-2 flex flex-col gap-4 min-h-0">

          {/* Dipanggil */}
          <div className="shrink-0">
            <h2 className="text-xs font-bold text-yellow-300 uppercase tracking-widest mb-2">
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

          {/* Sedang Dilayani */}
          {data.serving.length > 0 && (
            <div className="shrink-0">
              <h2 className="text-xs font-bold text-green-300 uppercase tracking-widest mb-2">
                ✋ Sedang Dilayani
              </h2>
              <div className={`grid gap-3 ${data.serving.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {data.serving.map((q) => <ServingCard key={q.id} item={q} />)}
              </div>
            </div>
          )}

          {/* Daftar Menunggu + Terakhir Dilayani — side by side, flex-1 */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">

            {/* Daftar Menunggu */}
            <div className="flex flex-col min-h-0">
              <h2 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 shrink-0">
                ⏳ Menunggu
                {data.waiting.length > 0 && (
                  <span className="ml-1.5 text-blue-300 normal-case font-normal">({data.waiting.length})</span>
                )}
              </h2>
              <div className="flex-1 min-h-0 overflow-hidden bg-white/5 rounded-2xl p-3">
                {data.waiting.length > 0 ? (
                  <div className="space-y-2 h-full overflow-y-auto">
                    {data.waiting.slice(0, 8).map((q, i) => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                          i === 0 ? "bg-blue-500/30 border border-blue-400/40" : "bg-white/5"
                        }`}
                      >
                        <span className="font-black text-white text-lg w-14 shrink-0">{q.formattedNumber}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-blue-100 text-xs truncate">{q.service?.name}</p>
                          {q.queueType === "disability" && (
                            <span className="text-purple-300 text-xs">♿</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/20 text-sm">—</p>
                  </div>
                )}
              </div>
            </div>

            {/* Terakhir Dilayani */}
            <div className="flex flex-col min-h-0">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 shrink-0">
                ✓ Terakhir Dilayani
              </h2>
              <div className="flex-1 min-h-0 overflow-hidden bg-white/5 rounded-2xl p-3">
                {data.recentDone.length > 0 ? (
                  <div className="space-y-2 h-full overflow-y-auto">
                    {data.recentDone.slice(0, 8).map((q) => (
                      <div key={q.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                        <span className="font-black text-white/50 text-lg w-14 shrink-0">{q.formattedNumber}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/40 text-xs truncate">{q.service?.name}</p>
                          <p className="text-white/30 text-xs truncate">{q.counter?.name ?? "—"}</p>
                        </div>
                        <span className="text-green-400/60 text-xs shrink-0">✓</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/20 text-sm">—</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT: Berikutnya + Stats + Slideshow */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Berikutnya — compact */}
          <div className="shrink-0">
            <h2 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-2">
              ⏭ Berikutnya
            </h2>
            {nextQueue ? (
              <div className="bg-white rounded-2xl p-4 text-center shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Nomor Berikutnya</p>
                <p className="text-4xl font-black text-blue-600 leading-tight">{nextQueue.formattedNumber}</p>
                <p className="text-gray-400 text-xs mt-1 truncate">{nextQueue.service?.name}</p>
              </div>
            ) : (
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <p className="text-white/30">—</p>
              </div>
            )}
          </div>

          {/* Stats — compact */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-yellow-300 text-xs uppercase tracking-wide mb-0.5">Menunggu</p>
              <p className="text-3xl font-black text-yellow-400">{data.totalWaiting}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-green-300 text-xs uppercase tracking-wide mb-0.5">Dilayani</p>
              <p className="text-3xl font-black text-green-400">{data.totalServed}</p>
            </div>
          </div>

          {/* Slideshow — flex-1 mengisi sisa ruang */}
          <div className="relative flex-1 min-h-0">
            <AdSlideshow ads={ads} />
            {ads.length === 0 && (
              <div className="h-full bg-white/5 rounded-2xl flex items-center justify-center">
                <p className="text-white/20 text-sm">—</p>
              </div>
            )}
          </div>
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
