"use client";

import { format } from "date-fns";

interface TicketData {
  officeName: string;
  formattedNumber: string;
  serviceName: string;
  queueType: string;
  visitorName: string;
  createdAt: Date;
}

const GRATIFIKASI = "BPOM di Lubuklinggau tidak menerima\ngratifikasi dalam bentuk apapun";

function queueTypeLabel(t: string) {
  return t === "disability" ? "Disabilitas / Prioritas" : "Umum";
}

export async function printTicketSerial(data: TicketData): Promise<boolean> {
  if (!("serial" in navigator)) {
    console.warn("Web Serial API tidak didukung");
    return false;
  }
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();

    const lines = [
      "\x1B\x40",           // Init printer
      "\x1B\x61\x01",       // Center align
      "\x1B\x21\x08",       // Bold, normal size (smaller than before)
      `${data.officeName}\n`,
      "\x1B\x21\x00",       // Normal
      "================================\n",
      `NOMOR ANTRIAN\n`,
      "\x1B\x21\x38",       // Big bold
      `${data.formattedNumber}\n`,
      "\x1B\x21\x00",       // Normal
      "================================\n",
      "\x1B\x61\x00",       // Left align
      `Layanan  : ${data.serviceName}\n`,
      `Jenis    : ${queueTypeLabel(data.queueType)}\n`,
      `Nama     : ${data.visitorName}\n`,
      `Waktu    : ${format(data.createdAt, "HH:mm - dd/MM/yyyy")}\n`,
      "================================\n",
      "\x1B\x61\x01",       // Center
      "Mohon tunggu panggilan Anda\n",
      "Please wait for your call\n",
      "\n",
      "\x1B\x21\x00",
      `${GRATIFIKASI}\n`,
      "\n\n\n",
      "\x1D\x56\x41\x03",   // Cut paper
    ];

    await writer.write(encoder.encode(lines.join("")));
    writer.releaseLock();
    await port.close();
    return true;
  } catch (err) {
    console.error("Print error:", err);
    return false;
  }
}

export function printTicketWindow(data: TicketData) {
  const html = `
    <html><head><style>
      @media print { body { margin: 0; } }
      body { font-family: monospace; width: 80mm; font-size: 12px; text-align: center; }
      .header { font-size: 14px; font-weight: bold; margin: 4px 0; }
      .number { font-size: 36px; font-weight: bold; margin: 8px 0; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .left { text-align: left; }
      .note { font-size: 10px; margin-top: 6px; }
    </style></head><body>
      <p class="header">${data.officeName}</p>
      <div class="line"></div>
      <p>NOMOR ANTRIAN</p>
      <p class="number">${data.formattedNumber}</p>
      <div class="line"></div>
      <div class="left">
        <p>Layanan  : ${data.serviceName}</p>
        <p>Jenis    : ${queueTypeLabel(data.queueType)}</p>
        <p>Nama     : ${data.visitorName}</p>
        <p>Waktu    : ${format(data.createdAt, "HH:mm - dd/MM/yyyy")}</p>
      </div>
      <div class="line"></div>
      <p>Mohon tunggu panggilan Anda</p>
      <p>Please wait for your call</p>
      <div class="line"></div>
      <p class="note">${GRATIFIKASI.replace("\n", "<br>")}</p>
    </body></html>
  `;

  const win = window.open("", "_blank", "width=400,height=650");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}
