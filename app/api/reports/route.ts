import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getTodayDate, formatQueueNumber } from "@/lib/queue-utils";
import { differenceInMinutes } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getTodayDate();

  const queues = await db.queue.findMany({
    where: { date },
    include: { service: true, counter: true },
    orderBy: { createdAt: "asc" },
  });

  const totalServed = queues.filter((q) => q.status === "done").length;
  const totalSkipped = queues.filter((q) => q.status === "skipped").length;
  const totalWaiting = queues.filter((q) => q.status === "waiting").length;

  const servedQueues = queues.filter((q) => q.status === "done" && q.calledAt && q.createdAt);
  const avgWaitMinutes =
    servedQueues.length > 0
      ? Math.round(
          servedQueues.reduce((acc, q) => acc + differenceInMinutes(q.calledAt!, q.createdAt), 0) /
            servedQueues.length
        )
      : 0;

  const rows = queues.map((q) => ({
    id: q.id,
    number: formatQueueNumber(q.prefix, q.number),
    visitorName: q.visitorName,
    nik: q.nik,
    phone: q.phone,
    service: q.service.name,
    counter: q.counter?.name ?? "-",
    status: q.status,
    queueType: q.queueType,
    createdAt: q.createdAt,
    calledAt: q.calledAt,
    doneAt: q.doneAt,
    waitMinutes: q.calledAt ? differenceInMinutes(q.calledAt, q.createdAt) : null,
  }));

  return NextResponse.json({
    date,
    summary: { totalServed, totalSkipped, totalWaiting, avgWaitMinutes },
    rows,
  });
}
