"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BackupManagement() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = useCallback(async () => {
    const res = await fetch("/api/admin/backup");
    if (res.ok) setBackups(await res.json());
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleManualBackup = async () => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (!res.ok) { setErrorMsg("Gagal membuat backup."); return; }
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `backup-${new Date().toISOString().slice(0, 10)}.db`;
      triggerDownload(await res.blob(), filename);
      await fetchBackups();
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setDownloading(filename);
    try {
      const res = await fetch(`/api/admin/backup/${filename}`);
      if (res.ok) triggerDownload(await res.blob(), filename);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleting(filename);
    await fetch(`/api/admin/backup/${filename}`, { method: "DELETE" });
    setBackups((prev) => prev.filter((b) => b.filename !== filename));
    setDeleting(null);
  };

  const openRestoreConfirm = (filename: string) => {
    setRestoreTarget(filename);
    setRestoreFile(null);
    setConfirmOpen(true);
  };

  const openRestoreFileConfirm = (file: File) => {
    setRestoreFile(file);
    setRestoreTarget(null);
    setConfirmOpen(true);
  };

  const handleRestore = async () => {
    setConfirmOpen(false);
    setRestoring(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      let res: Response;
      if (restoreFile) {
        const fd = new FormData();
        fd.append("file", restoreFile);
        res = await fetch("/api/admin/restore", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/admin/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: restoreTarget }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message ?? "Restore berhasil.");
        await fetchBackups();
      } else {
        setErrorMsg(data.error ?? "Restore gagal.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat restore.");
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Feedback messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* Manual backup */}
      <Card>
        <CardHeader><CardTitle>Backup Manual</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Buat salinan database sekarang dan langsung diunduh. File <code>.db</code> dapat
            digunakan untuk memulihkan data jika terjadi kerusakan.
          </p>
          <Button onClick={handleManualBackup} disabled={creating}>
            {creating ? "Membuat backup..." : "⬇️ Download Backup Sekarang"}
          </Button>
        </CardContent>
      </Card>

      {/* Restore from file */}
      <Card>
        <CardHeader><CardTitle>Pulihkan dari File</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Upload file backup <code>.db</code> dari perangkat Anda untuk memulihkan database.
            Sebelum restore, backup otomatis dari kondisi saat ini akan dibuat terlebih dahulu.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) openRestoreFileConfirm(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-backup list */}
      <Card>
        <CardHeader><CardTitle>Backup Otomatis</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Backup berjalan setiap 24 jam dan disimpan di folder <code>backups/</code> server.
            Maksimal 7 file — yang terlama dihapus otomatis.
          </p>
          {backups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Belum ada backup tersimpan. Backup pertama dibuat 30 detik setelah server dinyalakan.
            </p>
          ) : (
            <div className="space-y-2">
              {backups.map((b, i) => (
                <div
                  key={b.filename}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    i === 0 ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="font-mono text-xs font-medium">{b.filename}</p>
                    <p className="text-gray-400 text-xs">
                      {formatDate(b.createdAt)} · {formatBytes(b.size)}
                      {i === 0 && <span className="ml-2 text-blue-600 font-medium">terbaru</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading === b.filename}
                      onClick={() => handleDownload(b.filename)}
                      title="Download"
                    >
                      ⬇️
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoring}
                      onClick={() => openRestoreConfirm(b.filename)}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                      title="Pulihkan"
                    >
                      {restoring ? "..." : "♻️"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleting === b.filename}
                      onClick={() => handleDelete(b.filename)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      title="Hapus"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Restore</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {restoreFile
                  ? `Pulihkan database dari file "${restoreFile.name}"?`
                  : `Pulihkan database dari backup "${restoreTarget}"?`}
              </span>
              <span className="block font-medium text-amber-700">
                ⚠️ Semua data saat ini akan digantikan dengan isi backup. Tindakan ini tidak
                dapat dibatalkan. Backup kondisi saat ini akan dibuat otomatis sebelum proses
                dimulai.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Ya, Pulihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
