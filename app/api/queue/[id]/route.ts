import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitQueueUpdate } from "@/lib/emit";
import { getSession } from "@/lib/auth";
import { getTodayDate, formatQueueNumber } from "@/lib/queue-utils";

const MAX_CALLS_BEFORE_PERMANENT_SKIP = 2;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, counterId } = await req.json();

  const queue = await db.queue.findUnique({ where: { id: parseInt(id) }, include: { service: true } });
  if (!queue) return NextResponse.json({ error: "Antrian tidak ditemukan" }, { status: 404 });

  let updated;

  switch (action) {
    case "call":
      updated = await db.queue.update({
        where: { id: queue.id },
        data: {
          status: "called",
          calledAt: new Date(),
          callCount: { increment: 1 },
          ...(counterId ? { counterId } : {}),
        },
        include: { service: true, counter: true },
      });
      emitQueueUpdate("queue:called", { ...updated, formattedNumber: formatQueueNumber(updated.prefix, updated.number) });
      break;

    case "recall":
      updated = await db.queue.update({
        where: { id: queue.id },
        data: {
          calledAt: new Date(),
          callCount: { increment: 1 },
        },
        include: { service: true, counter: true },
      });
      emitQueueUpdate("queue:recalled", { ...updated, formattedNumber: formatQueueNumber(updated.prefix, updated.number) });
      break;

    case "serve":
      updated = await db.queue.update({
        where: { id: queue.id },
        data: { status: "serving", servedAt: new Date() },
        include: { service: true, counter: true },
      });
      emitQueueUpdate("queue:serving", { ...updated, formattedNumber: formatQueueNumber(updated.prefix, updated.number) });
      break;

    case "done":
      updated = await db.queue.update({
        where: { id: queue.id },
        data: { status: "done", doneAt: new Date() },
        include: { service: true, counter: true },
      });
      emitQueueUpdate("queue:done", updated);
      break;

    case "skip": {
      const isPermanent = queue.callCount >= MAX_CALLS_BEFORE_PERMANENT_SKIP;

      if (isPermanent) {
        // Sudah dipanggil 2x atau lebih → skip permanen
        updated = await db.queue.update({
          where: { id: queue.id },
          data: { status: "skipped", doneAt: new Date() },
          include: { service: true, counter: true },
        });
        emitQueueUpdate("queue:skipped", { ...updated, permanent: true });
      } else {
        // Pertama kali dilewati → pindah ke akhir antrian
        const lastQueue = await db.queue.findFirst({
          where: { date: getTodayDate(), prefix: queue.prefix },
          orderBy: { number: "desc" },
        });
        const newNumber = (lastQueue?.number ?? queue.number) + 1;

        updated = await db.queue.update({
          where: { id: queue.id },
          data: {
            status: "waiting",
            number: newNumber,
            calledAt: null,
            counterId: null,
          },
          include: { service: true, counter: true },
        });
        emitQueueUpdate("queue:requeued", {
          ...updated,
          previousNumber: queue.number,
          callCount: queue.callCount,
          remainingChances: MAX_CALLS_BEFORE_PERMANENT_SKIP - queue.callCount - 1,
        });
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  }

  return NextResponse.json(updated);
}
