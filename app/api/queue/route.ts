import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitQueueUpdate } from "@/lib/emit";
import { getTodayDate, formatQueueNumber, estimateWaitTime } from "@/lib/queue-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getTodayDate();
  const status = searchParams.get("status");
  const counterId = searchParams.get("counterId");

  const queues = await db.queue.findMany({
    where: {
      date,
      ...(status ? { status } : {}),
      ...(counterId ? { counterId: parseInt(counterId) } : {}),
    },
    include: { service: true, counter: true },
    // disability first, then never-called, then by number, then by registration order
    orderBy: [{ queueType: "asc" }, { callCount: "asc" }, { number: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(queues);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { visitorName, nik, phone, serviceId, queueType = "single", counterId } = body;

  if (!visitorName || !nik || !phone || !serviceId) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const today = getTodayDate();
  const service = await db.service.findUnique({ where: { id: parseInt(serviceId) } });
  if (!service) return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 404 });

  const prefix = queueType === "disability" ? "P" : service.prefix;

  const lastQueue = await db.queue.findFirst({
    where: { date: today, prefix },
    orderBy: { number: "desc" },
  });

  const newNumber = (lastQueue?.number ?? 0) + 1;

  const waitingCount = await db.queue.count({
    where: { date: today, status: "waiting" },
  });

  const avgServeMin = parseInt(
    (await db.setting.findUnique({ where: { key: "avg_serve_minutes" } }))?.value ?? "5"
  );

  const queue = await db.queue.create({
    data: {
      number: newNumber,
      prefix,
      queueType,
      status: "waiting",
      visitorName,
      nik,
      phone,
      serviceId: parseInt(serviceId),
      date: today,
      ...(counterId ? { counterId: parseInt(counterId) } : {}),
    },
    include: { service: true, counter: true },
  });

  const formattedNumber = formatQueueNumber(prefix, newNumber);
  const estimatedWait = estimateWaitTime(waitingCount, avgServeMin);

  emitQueueUpdate("queue:new", { queue, formattedNumber, estimatedWait });

  return NextResponse.json({ queue, formattedNumber, estimatedWait }, { status: 201 });
}
