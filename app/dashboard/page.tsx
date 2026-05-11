"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QueueControl } from "@/components/dashboard/QueueControl";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ReportsPanel } from "@/components/dashboard/ReportsPanel";
import { CounterManagement } from "@/components/dashboard/CounterManagement";
import { StaffManagement } from "@/components/admin/StaffManagement";
import { ServiceManagement } from "@/components/admin/ServiceManagement";
import { CounterAdmin } from "@/components/admin/CounterAdmin";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { AdsManagement } from "@/components/admin/AdsManagement";
import { BackupManagement } from "@/components/admin/BackupManagement";
import { formatQueueNumber } from "@/lib/queue-utils";

interface Staff {
  id: number;
  name: string;
  role: string;
}

interface Counter {
  id: number;
  name: string;
  code: string;
  isOpen: boolean;
}

interface QueueItem {
  id: number;
  prefix: string;
  number: number;
  queueType: string;
  visitorName: string;
  service: { name: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCounters = useCallback(async () => {
    const res = await fetch("/api/counters");
    setCounters(await res.json());
  }, []);

  const fetchWaiting = useCallback(async () => {
    const res = await fetch("/api/queue?status=waiting");
    setWaitingQueue(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/counters").then((r) => r.json()),
      fetch("/api/queue?status=waiting").then((r) => r.json()),
    ]).then(([s, c, q]) => {
      if (!s) { router.push("/dashboard/login"); return; }
      setStaff(s);
      setCounters(c);
      setWaitingQueue(q);
      setLoading(false);
    });
  }, [router]);

  // Sync counter status realtime
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:dashboard");

    socket.on("counter:status", (updated: Counter) => {
      setCounters((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    });

    socket.on("queue:new", fetchWaiting);
    socket.on("queue:called", fetchWaiting);
    socket.on("queue:done", fetchWaiting);
    socket.on("queue:skipped", fetchWaiting);
    socket.on("queue:requeued", fetchWaiting);
    socket.on("queue:reset", fetchWaiting);

    return () => {
      socket.off("counter:status");
      socket.off("queue:new", fetchWaiting);
      socket.off("queue:called", fetchWaiting);
      socket.off("queue:done", fetchWaiting);
      socket.off("queue:skipped", fetchWaiting);
      socket.off("queue:requeued", fetchWaiting);
      socket.off("queue:reset", fetchWaiting);
    };
  }, [fetchWaiting]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
  };

  const handleReset = async () => {
    await fetch("/api/queue/reset", { method: "POST" });
    fetchWaiting();
  };

  const openCounter = async (counterId: number) => {
    await fetch("/api/counters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId, isOpen: true }),
    });
    // update akan datang via socket counter:status
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  const openCounters = counters.filter((c) => c.isOpen);
  const closedCounters = counters.filter((c) => !c.isOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-lg">Dashboard Petugas</h1>
          <p className="text-sm text-gray-500">BPOM Lubuklinggau</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">👤 {staff?.name}</span>

          {staff?.role === "admin" && (
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              🔄 Reset Antrian
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Antrian?</AlertDialogTitle>
                <AlertDialogDescription>
                  Semua antrian yang sedang berjalan hari ini akan direset. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-red-600">
                  Ya, Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}

          <Button variant="outline" size="sm" onClick={handleLogout}>
            Keluar
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Statistics */}
        <StatsCard />

        {/* Tabs */}
        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">
              Antrian
              {waitingQueue.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {waitingQueue.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="counters">Kelola Loket</TabsTrigger>
            <TabsTrigger value="reports">Laporan</TabsTrigger>
            {staff?.role === "admin" && (
              <TabsTrigger value="admin">⚙️ Admin</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="queue" className="mt-4 space-y-4">
            {/* No open counters — show quick open + waiting list */}
            {openCounters.length === 0 ? (
              <div className="space-y-4">
                {/* Quick open counter */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-medium text-amber-800 mb-3">
                    ⚠️ Belum ada loket yang dibuka. Buka loket untuk mulai melayani antrian.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {closedCounters.map((c) => (
                      <Button key={c.id} size="sm" onClick={() => openCounter(c.id)}>
                        Buka {c.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Waiting queue preview */}
                {waitingQueue.length > 0 && (
                  <div className="bg-white rounded-xl border p-4">
                    <p className="font-medium text-gray-700 mb-3">
                      Antrian Menunggu ({waitingQueue.length})
                    </p>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {waitingQueue.map((q, i) => (
                        <div key={q.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${i === 0 ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}>
                          <span className="font-black text-blue-700 text-lg w-16">
                            {formatQueueNumber(q.prefix, q.number)}
                          </span>
                          <span className="text-gray-700 flex-1 ml-3">{q.visitorName}</span>
                          <span className="text-gray-400 text-sm">{q.service.name}</span>
                          {q.queueType === "disability" && (
                            <Badge className="ml-2 bg-purple-600 text-xs">♿</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`grid gap-4 ${openCounters.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-md"}`}>
                {openCounters.map((counter) => (
                  <QueueControl key={counter.id} counter={counter} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="counters" className="mt-4">
            <CounterManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ReportsPanel />
          </TabsContent>

          {staff?.role === "admin" && (
            <TabsContent value="admin" className="mt-4">
              <Tabs defaultValue="staff">
                <TabsList className="mb-4">
                  <TabsTrigger value="staff">Petugas</TabsTrigger>
                  <TabsTrigger value="services">Layanan</TabsTrigger>
                  <TabsTrigger value="counters-admin">Loket</TabsTrigger>
                  <TabsTrigger value="announcements">Pengumuman</TabsTrigger>
                  <TabsTrigger value="ads">Iklan</TabsTrigger>
                  <TabsTrigger value="backup">Backup</TabsTrigger>
                  <TabsTrigger value="settings">Pengaturan</TabsTrigger>
                </TabsList>
                <TabsContent value="staff"><StaffManagement /></TabsContent>
                <TabsContent value="services"><ServiceManagement /></TabsContent>
                <TabsContent value="counters-admin"><CounterAdmin /></TabsContent>
                <TabsContent value="announcements"><AnnouncementManagement /></TabsContent>
                <TabsContent value="ads"><AdsManagement /></TabsContent>
                <TabsContent value="backup"><BackupManagement /></TabsContent>
                <TabsContent value="settings"><SettingsPanel /></TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
