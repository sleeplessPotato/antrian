import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTodayDate, formatQueueNumber } from "@/lib/queue-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const counterId = searchParams.get("counterId");
  const today = getTodayDate();

  const [called, serving, waiting, recentDone, totalWaiting, totalServed] = await Promise.all([
    db.queue.findMany({
      where: {
        date: today,
        status: "called",
        ...(counterId ? { counterId: parseInt(counterId) } : {}),
      },
      include: { service: true, counter: true },
      orderBy: { calledAt: "desc" },
    }),
    db.queue.findMany({
      where: {
        date: today,
        status: "serving",
        ...(counterId ? { counterId: parseInt(counterId) } : {}),
      },
      include: { service: true, counter: true },
      orderBy: { servedAt: "desc" },
    }),
    db.queue.findMany({
      where: {
        date: today,
        status: "waiting",
        ...(counterId ? { counterId: parseInt(counterId) } : {}),
      },
      include: { service: true, counter: true },
      orderBy: [{ queueType: "asc" }, { callCount: "asc" }, { number: "asc" }, { id: "asc" }],
      take: 5,
    }),
    db.queue.findMany({
      where: { date: today, status: "done" },
      include: { service: true, counter: true },
      orderBy: { doneAt: "desc" },
      take: 5,
    }),
    db.queue.count({ where: { date: today, status: "waiting" } }),
    db.queue.count({ where: { date: today, status: "done" } }),
  ]);

  const fmt = (q: (typeof called)[number]) => ({ ...q, formattedNumber: formatQueueNumber(q.prefix, q.number) });

  return NextResponse.json({
    called:     called.map(fmt),
    serving:    serving.map(fmt),
    waiting:    waiting.map(fmt),
    recentDone: recentDone.map(fmt),
    totalWaiting,
    totalServed,
  });
}
