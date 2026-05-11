"use client";

import { formatQueueNumber } from "./queue-utils";
import { format } from "date-fns";

interface TicketData {
  officeName: string;
  formattedNumber: string;
  serviceName: string;
  visitorName: string;
  estimatedWait: number;
  createdAt: Date;
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
      "\x1B\x21\x30",       // Double size
      `${data.officeName}\n`,
      "\x1B\x21\x00",       // Normal size
      "================================\n",
      `NOMOR ANTRIAN\n`,
      "\x1B\x21\x38",       // Big bold
      `${data.formattedNumber}\n`,
      "\x1B\x21\x00",       // Normal
      "================================\n",
      "\x1B\x61\x00",       // Left align
      `Layanan  : ${data.serviceName}\n`,
      `Nama     : ${data.visitorName}\n`,
      `Estimasi : ~${data.estimatedWait} menit\n`,
      `Waktu    : ${format(data.createdAt, "HH:mm - dd/MM/yyyy")}\n`,
      "================================\n",
      "\x1B\x61\x01",       // Center
      "Mohon tunggu panggilan Anda\n",
      "Please wait for your call\n",
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
      .big { font-size: 32px; font-weight: bold; margin: 8px 0; }
      .line { border-top: 1px dashed #000; margin: 4px 0; }
      .left { text-align: left; }
    </style></head><body>
      <p><strong>${data.officeName}</strong></p>
      <div class="line"></div>
      <p>NOMOR ANTRIAN</p>
      <p class="big">${data.formattedNumber}</p>
      <div class="line"></div>
      <div class="left">
        <p>Layanan  : ${data.serviceName}</p>
        <p>Nama     : ${data.visitorName}</p>
        <p>Estimasi : ~${data.estimatedWait} menit</p>
        <p>Waktu    : ${format(data.createdAt, "HH:mm - dd/MM/yyyy")}</p>
      </div>
      <div class="line"></div>
      <p>Mohon tunggu panggilan Anda</p>
    </body></html>
  `;

  const win = window.open("", "_blank", "width=400,height=600");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}
