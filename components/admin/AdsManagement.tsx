"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Ad {
  id: number;
  filename: string;
  originalName: string;
  type: string;
  isActive: boolean;
  order: number;
}

export function AdsManagement() {
  const [list, setList] = useState<Ad[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/ads?all=true");
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/ads", { method: "POST", body: form });
    if (res.ok) { fetch_(); }
    else { const d = await res.json(); setError(d.error ?? "Gagal upload"); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const toggleActive = async (ad: Ad) => {
    await fetch(`/api/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ad.isActive }),
    });
    fetch_();
  };

  const remove = async (ad: Ad) => {
    if (!confirm(`Hapus "${ad.originalName}"?`)) return;
    await fetch(`/api/ads/${ad.id}`, { method: "DELETE" });
    fetch_();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Iklan / Slideshow</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Format: JPG, PNG, PDF · Tampil otomatis di layar display</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={upload}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Mengupload..." : "+ Upload Iklan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {list.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-sm">Belum ada iklan. Upload JPG, PNG, atau PDF.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {list.map((ad) => (
            <div
              key={ad.id}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                ad.isActive ? "border-blue-300" : "border-gray-200 opacity-60"
              }`}
            >
              {/* Preview */}
              <div className="bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
                {ad.type === "image" ? (
                  <img
                    src={`/ads/${ad.filename}`}
                    alt={ad.originalName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <span className="text-4xl">📄</span>
                    <span className="text-xs mt-1">PDF</span>
                  </div>
                )}
              </div>

              {/* Info + actions */}
              <div className="p-3 bg-white space-y-2">
                <p className="text-xs font-medium text-gray-700 truncate" title={ad.originalName}>
                  {ad.originalName}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={ad.isActive ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleActive(ad)}
                  >
                    {ad.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs ml-auto"
                    onClick={() => remove(ad)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
