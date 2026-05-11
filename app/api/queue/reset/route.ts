import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitQueueUpdate } from "@/lib/emit";
import { getSession } from "@/lib/auth";
import { getTodayDate } from "@/lib/queue-utils";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getTodayDate();

  await db.queue.updateMany({
    where: { date: today, status: { in: ["waiting", "called", "serving"] } },
    data: { status: "skipped", doneAt: new Date() },
  });

  emitQueueUpdate("queue:reset", { date: today });

  return NextResponse.json({ ok: true });
}
