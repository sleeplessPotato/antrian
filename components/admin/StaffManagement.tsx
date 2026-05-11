"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Staff {
  id: number;
  name: string;
  username: string;
  role: string;
}

const emptyForm = { name: "", username: "", password: "", role: "staff" };

export function StaffManagement() {
  const [list, setList] = useState<Staff[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/staff");
    if (res.ok) setList(await res.json());
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (s: Staff) => { setEditing(s); setForm({ name: s.name, username: s.username, password: "", role: s.role }); setError(""); setOpen(true); };

  const save = async () => {
    setLoading(true); setError("");
    const url  = editing ? `/api/staff/${editing.id}` : "/api/staff";
    const method = editing ? "PATCH" : "POST";
    const body = editing
      ? { name: form.name, username: form.username, role: form.role, ...(form.password ? { password: form.password } : {}) }
      : form;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setOpen(false); fetch_(); }
    else { const d = await res.json(); setError(d.error ?? "Gagal menyimpan"); }
    setLoading(false);
  };

  const remove = async (s: Staff) => {
    if (!confirm(`Hapus akun "${s.name}"?`)) return;
    await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
    fetch_();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Petugas</CardTitle>
        <Button size="sm" onClick={openAdd}>+ Tambah Petugas</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-gray-500">@{s.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.role === "admin" ? "default" : "secondary"}>
                  {s.role === "admin" ? "Admin" : "Petugas"}
                </Badge>
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
            <DialogTitle>{editing ? "Edit Petugas" : "Tambah Petugas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Lengkap</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Username</Label>
              <Input className="mt-1" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>{editing ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}</Label>
              <Input className="mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Petugas</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
