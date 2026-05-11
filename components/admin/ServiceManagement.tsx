"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Service {
  id: number;
  name: string;
  nameEn: string;
  code: string;
  prefix: string;
  order: number;
  isActive: boolean;
}

const emptyForm = { name: "", nameEn: "", code: "", prefix: "A", order: 0 };

export function ServiceManagement() {
  const [list, setList] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/services");
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, nameEn: s.nameEn, code: s.code, prefix: s.prefix, order: s.order });
    setError(""); setOpen(true);
  };

  const save = async () => {
    setLoading(true); setError("");
    const url    = editing ? `/api/services/${editing.id}` : "/api/services";
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

  const remove = async (s: Service) => {
    if (!confirm(`Nonaktifkan layanan "${s.name}"?`)) return;
    await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    fetch_();
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Layanan</CardTitle>
        <Button size="sm" onClick={openAdd}>+ Tambah Layanan</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{s.prefix}</span>
                  <p className="font-semibold">{s.name}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{s.nameEn} · Kode: {s.code} · Urutan: {s.order}</p>
              </div>
              <div className="flex items-center gap-2">
                {!s.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(s)}>Hapus</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Layanan" : "Tambah Layanan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama (Indonesia)</Label>
              <Input className="mt-1" value={form.name} onChange={f("name")} />
            </div>
            <div>
              <Label>Nama (Inggris)</Label>
              <Input className="mt-1" value={form.nameEn} onChange={f("nameEn")} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Kode</Label>
                <Input className="mt-1" value={form.code} onChange={f("code")} placeholder="KP" />
              </div>
              <div>
                <Label>Prefix</Label>
                <Input className="mt-1" value={form.prefix} onChange={f("prefix")} placeholder="A" maxLength={2} />
              </div>
              <div>
                <Label>Urutan</Label>
                <Input className="mt-1" type="number" value={form.order} onChange={f("order")} />
              </div>
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
