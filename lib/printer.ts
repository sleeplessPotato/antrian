"use client";

import { format } from "date-fns";

export interface TicketData {
  officeName: string;
  formattedNumber: string;
  serviceName: string;
  queueType: string;
  visitorName: string;
  createdAt: Date;
}

function queueTypeLabel(t: string) {
  return t === "disability" ? "Disabilitas / Prioritas" : "Umum";
}

// ESC/POS: thermal printer via Web Serial API
export async function printTicketSerial(data: TicketData): Promise<boolean> {
  if (!("serial" in navigator)) return false;
  try {
    // Gunakan port yang sudah diizinkan sebelumnya — picker hanya muncul pertama kali
    const serial = (navigator as any).serial;
    const granted: any[] = await serial.getPorts();
    const port = granted.length > 0 ? granted[0] : await serial.requestPort();
    await port.open({ baudRate: 9600 });

    const enc  = new TextEncoder();
    const writer = port.writable.getWriter();

    // Build lines as array then join — easier to maintain
    const L = [
      "\x1B\x40",                    // Init
      "\x1B\x61\x01",                // Center
      "\x1B\x21\x08",                // Bold normal
      data.officeName + "\n",
      "\x1B\x21\x00",                // Normal
      "Layanan Pengawasan Obat dan Makanan\n",
      "--------------------------------\n",
      "NOMOR ANTRIAN\n",
      "\x1B\x21\x38",                // Double size bold
      data.formattedNumber + "\n",
      "\x1B\x21\x00",                // Normal
      "--------------------------------\n",
      "\x1B\x61\x00",                // Left
      `Layanan : ${data.serviceName}\n`,
      `Jenis   : ${queueTypeLabel(data.queueType)}\n`,
      `Nama    : ${data.visitorName}\n`,
      `Waktu   : ${format(data.createdAt, "HH:mm  dd/MM/yyyy")}\n`,
      "--------------------------------\n",
      "\x1B\x61\x01",                // Center
      "Mohon tunggu panggilan Anda\n",
      "Please wait for your call\n",
      "\n",
      "--------------------------------\n",
      "\x1B\x21\x01",                // Smaller font
      "BPOM di Lubuklinggau tidak\n",
      "menerima gratifikasi dalam\n",
      "bentuk apapun\n",
      "\x1B\x21\x00",
      "\n\n\n\n",                    // Feed cukup sebelum cut
      "\x1D\x56\x41\x05",           // Full cut + 5mm feed
    ];

    await writer.write(enc.encode(L.join("")));
    writer.releaseLock();
    await port.close();
    return true;
  } catch (err) {
    console.error("[printTicketSerial]", err);
    return false;
  }
}

// Fallback: browser print window
export function printTicketWindow(data: TicketData) {
  const win = window.open("", "_blank", "width=320,height=720");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 4mm; }
  @media print { body { margin: 0; } }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 72mm;
    padding: 2mm;
    text-align: center;
  }
  .header   { font-size: 13px; font-weight: bold; margin-bottom: 1mm; }
  .sub      { font-size: 9px; margin-bottom: 2mm; }
  .divider  { border-top: 1px dashed #000; margin: 2mm 0; }
  .label    { font-size: 10px; margin-bottom: 1mm; }
  .number   { font-size: 40px; font-weight: bold; line-height: 1.1; margin: 2mm 0; }
  .left     { text-align: left; font-size: 10px; line-height: 1.6; }
  .note     { font-size: 9px; line-height: 1.5; margin-top: 2mm; }
</style>
</head>
<body>
  <p class="header">${data.officeName}</p>
  <p class="sub">Layanan Pengawasan Obat dan Makanan</p>
  <div class="divider"></div>
  <p class="label">NOMOR ANTRIAN</p>
  <p class="number">${data.formattedNumber}</p>
  <div class="divider"></div>
  <div class="left">
    <p>Layanan : ${data.serviceName}</p>
    <p>Jenis   : ${queueTypeLabel(data.queueType)}</p>
    <p>Nama    : ${data.visitorName}</p>
    <p>Waktu   : ${format(data.createdAt, "HH:mm  dd/MM/yyyy")}</p>
  </div>
  <div class="divider"></div>
  <p>Mohon tunggu panggilan Anda</p>
  <p>Please wait for your call</p>
  <div class="divider"></div>
  <p class="note">
    BPOM di Lubuklinggau tidak menerima<br>
    gratifikasi dalam bentuk apapun
  </p>
</body>
</html>`);

  win.document.close();
  win.focus();
  // Beri waktu render sebelum print
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
