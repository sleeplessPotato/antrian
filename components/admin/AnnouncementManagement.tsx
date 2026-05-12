"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Announcement {
  id: number;
  text: string;
  textEn: string;
  isActive: boolean;
  order: number;
}

const emptyForm = { text: "", textEn: "", order: 0, isActive: true };

export function AnnouncementManagement() {
  const [list, setList] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/announcements?all=true");
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ text: a.text, textEn: a.textEn, order: a.order, isActive: a.isActive });
    setError(""); setOpen(true);
  };

  const save = async () => {
    setLoading(true); setError("");
    const url    = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: Number(form.order) }),
    });
    if (res.ok) { setOpen(false); fetch_(); }
    else { const d = await res.json(); setError(d.error ?? "Gagal menyimpan"); }
    setLoading(false);
  };

  const remove = async (a: Announcement) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
    fetch_();
  };

  const toggleActive = async (a: Announcement) => {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    fetch_();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pengumuman Berjalan</CardTitle>
        <Button size="sm" onClick={openAdd}>+ Tambah</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {list.map((a) => (
            <div key={a.id} className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.text}</p>
                  <p className="text-xs text-gray-400 truncate">{a.textEn}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant={a.isActive ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleActive(a)}
                  >
                    {a.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(a)}>Hapus</Button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada pengumuman</p>}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pengumuman" : "Tambah Pengumuman"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Teks (Indonesia)</Label>
              <Input className="mt-1" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            </div>
            <div>
              <Label>Teks (Inggris)</Label>
              <Input className="mt-1" value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} />
            </div>
            <div>
              <Label>Urutan</Label>
              <Input className="mt-1" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={save} disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
