"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Counter {
  id: number;
  name: string;
  code: string;
  isOpen: boolean;
  staff?: { id: number; name: string } | null;
}

const emptyForm = { name: "", code: "" };

export function CounterAdmin() {
  const [list, setList] = useState<Counter[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Counter | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/counters");
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (c: Counter) => { setEditing(c); setForm({ name: c.name, code: c.code }); setError(""); setOpen(true); };

  const save = async () => {
    setLoading(true); setError("");
    const url    = editing ? `/api/counters/${editing.id}` : "/api/counters";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setOpen(false); fetch_(); }
    else { const d = await res.json(); setError(d.error ?? "Gagal menyimpan"); }
    setLoading(false);
  };

  const remove = async (c: Counter) => {
    if (!confirm(`Hapus "${c.name}"? Semua data antrian loket ini akan terpengaruh.`)) return;
    const res = await fetch(`/api/counters/${c.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    fetch_();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Loket</CardTitle>
        <Button size="sm" onClick={openAdd}>+ Tambah Loket</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <Badge variant={c.isOpen ? "default" : "secondary"}>
                    {c.isOpen ? "Buka" : "Tutup"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Kode: {c.code}{c.staff ? ` · Petugas: ${c.staff.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(c)}>Hapus</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Loket" : "Tambah Loket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Loket</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Loket 1" />
            </div>
            <div>
              <Label>Kode (unik)</Label>
              <Input className="mt-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="L1" />
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
