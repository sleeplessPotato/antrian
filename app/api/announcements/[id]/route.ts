import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

function emitContentUpdated() {
  (global as any).io?.to("display").emit("content:updated");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const ann = await db.announcement.update({ where: { id: parseInt(id) }, data });
  emitContentUpdated();
  return NextResponse.json(ann);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.announcement.delete({ where: { id: parseInt(id) } });
  emitContentUpdated();
  return NextResponse.json({ ok: true });
}
