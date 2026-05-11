"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsPanel() {
  const [form, setForm] = useState({
    office_name: "",
    avg_serve_minutes: "5",
    voice_type: "tts",
    queue_mode: "single",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setForm((prev) => ({ ...prev, ...s }));
    });
  }, []);

  const save = async () => {
    setLoading(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Pengaturan Sistem</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-sm">
        <div>
          <Label>Nama Instansi</Label>
          <Input
            className="mt-1"
            value={form.office_name}
            onChange={(e) => setForm({ ...form, office_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Rata-rata Waktu Layanan (menit)</Label>
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.avg_serve_minutes}
            onChange={(e) => setForm({ ...form, avg_serve_minutes: e.target.value })}
          />
        </div>
        <div>
          <Label>Jenis Suara Pengumuman</Label>
          <Select value={form.voice_type} onValueChange={(v) => setForm({ ...form, voice_type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tts">Text-to-Speech</SelectItem>
              <SelectItem value="audio">Audio File</SelectItem>
              <SelectItem value="both">Keduanya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Mode Antrian</Label>
          <Select value={form.queue_mode} onValueChange={(v) => setForm({ ...form, queue_mode: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single (satu loket per antrian)</SelectItem>
              <SelectItem value="multi">Multi (bisa dilayani loket mana saja)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={loading} className="w-full">
          {saved ? "✓ Tersimpan" : loading ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </CardContent>
    </Card>
  );
}
