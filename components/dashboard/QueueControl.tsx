"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSocket } from "@/lib/socket-client";
import { formatQueueNumber } from "@/lib/queue-utils";
import { printTicketSerial, printTicketWindow } from "@/lib/printer";

interface Counter {
  id: number;
  name: string;
  code: string;
  isOpen: boolean;
}

interface QueueItem {
  id: number;
  formattedNumber: string;
  prefix: string;
  number: number;
  queueType: string;
  status: string;
  callCount: number;
  visitorName: string;
  service: { name: string };
  counter?: { name: string } | null;
}

function reprintTicket(q: QueueItem) {
  const data = {
    officeName: "BPOM Lubuklinggau",
    formattedNumber: formatQueueNumber(q.prefix, q.number),
    serviceName: q.service.name,
    queueType: q.queueType,
    visitorName: q.visitorName,
    createdAt: new Date(),
  };
  printTicketSerial(data).then((ok) => { if (!ok) printTicketWindow(data); });
}

interface SkipFeedback {
  message: string;
  type: "warning" | "error";
}

const MAX_CALLS = 2;

interface Props {
  counter: Counter;
}

export function QueueControl({ counter }: Props) {
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [waiting, setWaiting] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<SkipFeedback | null>(null);

  const fetchQueue = useCallback(async () => {
    const [currentRes, waitingRes] = await Promise.all([
      fetch(`/api/queue/current?counterId=${counter.id}`),
      fetch(`/api/queue?status=waiting`),
    ]);
    const [currentData, allWaiting] = await Promise.all([currentRes.json(), waitingRes.json()]);
    // serving takes priority over called as the active item for this counter
    setCurrent(currentData.serving[0] ?? currentData.called[0] ?? null);
    setWaiting(allWaiting.slice(0, 10));
  }, [counter.id]);

  useEffect(() => {
    fetchQueue();
    const socket = getSocket();
    socket.emit("join:dashboard", counter.id);
    socket.on("queue:new",      fetchQueue);
    socket.on("queue:called",   fetchQueue);
    socket.on("queue:serving",  fetchQueue);
    socket.on("queue:done",     fetchQueue);
    socket.on("queue:skipped",  fetchQueue);
    socket.on("queue:requeued", fetchQueue);
    socket.on("queue:reset",    fetchQueue);
    return () => {
      socket.off("queue:new",      fetchQueue);
      socket.off("queue:called",   fetchQueue);
      socket.off("queue:serving",  fetchQueue);
      socket.off("queue:done",     fetchQueue);
      socket.off("queue:skipped",  fetchQueue);
      socket.off("queue:requeued", fetchQueue);
      socket.off("queue:reset",    fetchQueue);
    };
  }, [fetchQueue, counter.id]);

  const action = async (id: number, act: string) => {
    setLoading(true);
    const res = await fetch(`/api/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, counterId: counter.id }),
    });
    const data = await res.json();

    if (act === "skip") {
      const isPermanent = data.status === "skipped";
      setSkipFeedback(
        isPermanent
          ? { message: `Nomor ${current?.formattedNumber} dilewati permanen (sudah dipanggil ${MAX_CALLS}x).`, type: "error" }
          : { message: `Nomor ${current?.formattedNumber} dipindah ke akhir antrian. Sisa kesempatan: 1x lagi.`, type: "warning" }
      );
      setTimeout(() => setSkipFeedback(null), 5000);
    }

    await fetchQueue();
    setLoading(false);
  };

  const callNext = async () => {
    const next =
      waiting.find((q) => q.queueType === "disability" && q.callCount === 0) ??
      waiting.find((q) => q.callCount === 0) ??
      waiting[0];
    if (!next) return;
    setLoading(true);
    await fetch(`/api/queue/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "call", counterId: counter.id }),
    });
    await fetchQueue();
    setLoading(false);
  };

  const callCountBadge = (count: number) => {
    if (count === 0) return null;
    const remaining = MAX_CALLS - count;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
        remaining <= 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
      }`}>
        {count}x dipanggil {remaining > 0 ? `· ${remaining}x lagi hangus` : "· berikutnya hangus"}
      </span>
    );
  };

  const isServing = current?.status === "serving";
  const bgCurrent = isServing ? "bg-green-50" : "bg-blue-50";
  const numColor  = isServing ? "text-green-700" : "text-blue-700";
  const statusLabel = isServing ? "Sedang Dilayani" : "Dipanggil";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{counter.name}</CardTitle>
          <Badge variant={counter.isOpen ? "default" : "secondary"}>
            {counter.isOpen ? "Buka" : "Tutup"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Skip feedback */}
        {skipFeedback && (
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${
            skipFeedback.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}>
            {skipFeedback.type === "warning" ? "⚠️" : "🚫"} {skipFeedback.message}
          </div>
        )}

        {/* Current active */}
        <div className={`${bgCurrent} rounded-xl p-4 text-center`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{statusLabel}</p>
          {current ? (
            <>
              <p className={`text-5xl font-black ${numColor}`}>{current.formattedNumber}</p>
              <p className="text-sm text-gray-600 mt-1">{current.visitorName}</p>
              <p className="text-xs text-gray-400">{current.service.name}</p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {current.queueType === "disability" && (
                  <Badge className="bg-purple-600">♿ Prioritas</Badge>
                )}
                {callCountBadge(current.callCount)}
              </div>
            </>
          ) : (
            <p className="text-3xl text-gray-300 font-bold">---</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Call next — only when nothing active */}
          <Button
            onClick={callNext}
            disabled={loading || waiting.length === 0 || !!current}
            className="h-12"
          >
            📣 Panggil Berikutnya
          </Button>

          {current && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => action(current.id, "recall")}
                  disabled={loading}
                >
                  🔁 Panggil Ulang
                </Button>
                <Button
                  variant="outline"
                  onClick={() => action(current.id, "skip")}
                  disabled={loading}
                  className={
                    current.callCount >= MAX_CALLS
                      ? "text-red-600 border-red-400 hover:bg-red-50"
                      : "text-orange-600 border-orange-300 hover:bg-orange-50"
                  }
                  title={
                    current.callCount >= MAX_CALLS
                      ? "Lewati permanen (sudah dipanggil 2x)"
                      : "Pindah ke akhir antrian"
                  }
                >
                  {current.callCount >= MAX_CALLS ? "🚫 Lewati" : "⏭️ Lewati"}
                </Button>
              </div>

              {/* Mulai Melayani — only while still in "called" state */}
              {!isServing && (
                <Button
                  onClick={() => action(current.id, "serve")}
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  ✋ Mulai Melayani
                </Button>
              )}

              <Button
                onClick={() => action(current.id, "done")}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                ✅ Selesai Dilayani
              </Button>
            </>
          )}
        </div>

        {/* Waiting list */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            ANTRIAN MENUNGGU ({waiting.length})
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {waiting.slice(0, 8).map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  i === 0 ? "bg-blue-50 font-medium" : "bg-gray-50"
                }`}
              >
                <span className="font-bold w-14">{formatQueueNumber(q.prefix, q.number)}</span>
                <span className="text-gray-500 truncate flex-1 mx-2">{q.visitorName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {q.queueType === "disability" && (
                    <span className="text-purple-600 text-xs">♿</span>
                  )}
                  {q.callCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      q.callCount >= MAX_CALLS
                        ? "bg-red-100 text-red-600"
                        : "bg-orange-100 text-orange-500"
                    }`}>
                      {q.callCount}x
                    </span>
                  )}
                  <button
                    onClick={() => reprintTicket(q)}
                    className="text-gray-400 hover:text-blue-600 transition-colors ml-1"
                    title="Cetak ulang tiket"
                  >
                    🖨️
                  </button>
                </div>
              </div>
            ))}
            {waiting.length === 0 && (
              <p className="text-gray-400 text-center py-2">Tidak ada antrian</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
