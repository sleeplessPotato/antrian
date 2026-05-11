import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, username, password, role } = await req.json();

  const data: Record<string, string> = {};
  if (name)     data.name     = name;
  if (username) data.username = username;
  if (role)     data.role     = role;
  if (password) data.password = await hashPassword(password);

  try {
    const staff = await db.staff.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, username: true, role: true },
    });
    return NextResponse.json(staff);
  } catch {
    return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id);

  if (numId === session.staffId) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  await db.staff.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}
