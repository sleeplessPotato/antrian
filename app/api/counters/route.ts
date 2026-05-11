import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { emitQueueUpdate } from "@/lib/emit";

export async function GET() {
  const counters = await db.counter.findMany({
    include: { staff: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(counters);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, code } = await req.json();
  const counter = await db.counter.create({
    data: { name, code },
    include: { staff: { select: { id: true, name: true } } },
  });
  return NextResponse.json(counter, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { counterId, isOpen, staffId } = await req.json();

  const counter = await db.counter.update({
    where: { id: counterId },
    data: {
      isOpen,
      ...(staffId !== undefined ? { staffId } : {}),
    },
    include: { staff: { select: { id: true, name: true } } },
  });

  emitQueueUpdate("counter:status", counter);

  return NextResponse.json(counter);
}
