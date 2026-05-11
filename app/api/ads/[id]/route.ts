import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const ad = await db.advertisement.update({ where: { id: parseInt(id) }, data });
  return NextResponse.json(ad);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ad = await db.advertisement.findUnique({ where: { id: parseInt(id) } });
  if (!ad) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await db.advertisement.delete({ where: { id: parseInt(id) } });
  try {
    await unlink(path.join(process.cwd(), "public", "ads", ad.filename));
  } catch { /* file mungkin sudah tidak ada */ }

  return NextResponse.json({ ok: true });
}
