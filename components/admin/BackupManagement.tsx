"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const fetchBackups = useCallback(async () => {
    const res = await fetch("/api/admin/backup");
    if (res.ok) setBackups(await res.json());
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleManualBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (!res.ok) return;
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Manual */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Buat salinan database sekarang dan langsung diunduh. File <code>.db</code> dapat
            dipulihkan jika terjadi kerusakan data.
          </p>
          <Button onClick={handleManualBackup} disabled={creating}>
            {creating ? "Membuat backup..." : "⬇️ Download Backup Sekarang"}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-backup list */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Otomatis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Backup otomatis berjalan setiap 24 jam sejak server dinyalakan dan disimpan di
            folder <code>backups/</code> pada server. Maksimal 7 file disimpan — yang terlama
            dihapus otomatis.
          </p>

          {backups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Belum ada backup tersimpan. Backup pertama akan dibuat 30 detik setelah server
              dinyalakan.
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
                      {i === 0 && (
                        <span className="ml-2 text-blue-600 font-medium">terbaru</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={deleting === b.filename}
                      onClick={() => handleDelete(b.filename)}
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
    </div>
  );
}
