"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getTodayDate } from "@/lib/queue-utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportRow {
  id: number;
  number: string;
  visitorName: string;
  nik: string;
  phone: string;
  service: string;
  counter: string;
  status: string;
  queueType: string;
  createdAt: string;
  calledAt: string | null;
  doneAt: string | null;
  waitMinutes: number | null;
}

interface Summary {
  totalServed: number;
  totalSkipped: number;
  totalWaiting: number;
  avgWaitMinutes: number;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  done:    { label: "Selesai",   color: "text-green-600" },
  skipped: { label: "Dilewati",  color: "text-orange-500" },
  waiting: { label: "Menunggu",  color: "text-blue-600" },
  called:  { label: "Dipanggil", color: "text-yellow-600" },
  serving: { label: "Dilayani",  color: "text-purple-600" },
};

const queueTypeLabel: Record<string, string> = {
  single:     "Umum",
  multi:      "Multi-loket",
  disability: "Disabilitas",
};

function VisitorDetailDialog({
  row,
  open,
  onClose,
}: {
  row: ReportRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;
  const st = statusLabel[row.status] ?? { label: row.status, color: "" };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-700">{row.number}</span>
            <Badge variant="outline" className={st.color}>{st.label}</Badge>
            {row.queueType === "disability" && (
              <Badge className="bg-purple-600">♿ Disabilitas</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Data Pengunjung */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Data Pengunjung
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <DetailRow label="Nama Lengkap" value={row.visitorName} />
              <DetailRow label="NIK" value={row.nik} mono />
              <DetailRow label="No. HP" value={row.phone} mono />
            </div>
          </div>

          <Separator />

          {/* Info Antrian */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Info Antrian
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <DetailRow label="Layanan" value={row.service} />
              <DetailRow label="Loket" value={row.counter !== "-" ? row.counter : "Belum ditentukan"} />
              <DetailRow label="Jenis Antrian" value={queueTypeLabel[row.queueType] ?? row.queueType} />
              <DetailRow label="Waktu Daftar" value={format(new Date(row.createdAt), "HH:mm:ss")} />
              {row.calledAt && (
                <DetailRow label="Waktu Dipanggil" value={format(new Date(row.calledAt), "HH:mm:ss")} />
              )}
              {row.doneAt && (
                <DetailRow label="Waktu Selesai" value={format(new Date(row.doneAt), "HH:mm:ss")} />
              )}
              <DetailRow
                label="Waktu Tunggu"
                value={row.waitMinutes !== null ? `${row.waitMinutes} menit` : "-"}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono tracking-wide" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function ReportsPanel() {
  const [date, setDate] = useState(getTodayDate());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);

  const load = async () => {
    const res = await fetch(`/api/reports?date=${date}`);
    const data = await res.json();
    setRows(data.rows);
    setSummary(data.summary);
    setLoaded(true);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "No. Antrian":   r.number,
        "Nama Lengkap":  r.visitorName,
        NIK:             r.nik,
        "No. HP":        r.phone,
        Layanan:         r.service,
        "Jenis Antrian": queueTypeLabel[r.queueType] ?? r.queueType,
        Loket:           r.counter,
        Status:          statusLabel[r.status]?.label ?? r.status,
        "Waktu Daftar":  format(new Date(r.createdAt), "HH:mm:ss"),
        "Waktu Dipanggil": r.calledAt ? format(new Date(r.calledAt), "HH:mm:ss") : "-",
        "Waktu Selesai": r.doneAt ? format(new Date(r.doneAt), "HH:mm:ss") : "-",
        "Tunggu (mnt)":  r.waitMinutes ?? "-",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `antrian-bpom-${date}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BPOM LUBUKLINGGAU", 14, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Laporan Data Antrian — ${date}`, 14, 21);

    if (summary) {
      doc.setFontSize(9);
      doc.text(
        `Dilayani: ${summary.totalServed}  |  Dilewati: ${summary.totalSkipped}  |  Menunggu: ${summary.totalWaiting}  |  Rata-rata Tunggu: ${summary.avgWaitMinutes} mnt`,
        14, 28
      );
    }

    autoTable(doc, {
      startY: 33,
      head: [[
        "No. Antrian", "Nama Lengkap", "NIK", "No. HP",
        "Layanan", "Loket", "Status", "Daftar", "Dipanggil", "Selesai", "Tunggu",
      ]],
      body: rows.map((r) => [
        r.number,
        r.visitorName,
        r.nik,
        r.phone,
        r.service,
        r.counter,
        statusLabel[r.status]?.label ?? r.status,
        format(new Date(r.createdAt), "HH:mm"),
        r.calledAt ? format(new Date(r.calledAt), "HH:mm") : "-",
        r.doneAt ? format(new Date(r.doneAt), "HH:mm") : "-",
        r.waitMinutes !== null ? `${r.waitMinutes}m` : "-",
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        2: { font: "courier" },  // NIK — monospace
        3: { font: "courier" },  // No. HP — monospace
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${i} dari ${pageCount}  —  Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    }

    doc.save(`antrian-bpom-${date}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Laporan Harian</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-sm font-medium">Tanggal</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40 mt-1"
              />
            </div>
            <Button onClick={load}>Tampilkan</Button>
            {loaded && (
              <>
                <Button variant="outline" onClick={exportExcel}>📊 Excel</Button>
                <Button variant="outline" onClick={exportPdf}>📄 PDF</Button>
              </>
            )}
          </div>

          {summary && (
            <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{summary.totalServed}</p>
                <p className="text-xs text-gray-500">Dilayani</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{summary.totalWaiting}</p>
                <p className="text-xs text-gray-500">Menunggu</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-orange-500">{summary.totalSkipped}</p>
                <p className="text-xs text-gray-500">Dilewati</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-purple-600">{summary.avgWaitMinutes}</p>
                <p className="text-xs text-gray-500">Avg Tunggu (mnt)</p>
              </div>
            </div>
          )}

          {loaded && (
            <div className="max-h-96 overflow-y-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Loket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tunggu</TableHead>
                    <TableHead className="text-center">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const st = statusLabel[r.status] ?? { label: r.status, color: "" };
                    return (
                      <TableRow key={r.id} className="hover:bg-gray-50">
                        <TableCell className="font-black text-blue-700">{r.number}</TableCell>
                        <TableCell>{r.visitorName}</TableCell>
                        <TableCell className="text-sm">{r.service}</TableCell>
                        <TableCell className="text-sm text-gray-500">{r.counter}</TableCell>
                        <TableCell className={`text-sm font-medium ${st.color}`}>{st.label}</TableCell>
                        <TableCell className="text-sm">{format(new Date(r.createdAt), "HH:mm")}</TableCell>
                        <TableCell className="text-sm">
                          {r.waitMinutes !== null ? `${r.waitMinutes} mnt` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => setSelectedRow(r)}
                          >
                            👁 Lihat
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <VisitorDetailDialog
        row={selectedRow}
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
