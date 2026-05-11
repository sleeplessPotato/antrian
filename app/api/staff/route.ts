import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await db.staff.findMany({
    select: { id: true, name: true, username: true, role: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, username, password, role } = await req.json();
  if (!name || !username || !password) {
    return NextResponse.json({ error: "name, username, password wajib diisi" }, { status: 400 });
  }

  const existing = await db.staff.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });

  const hashed = await hashPassword(password);
  const staff = await db.staff.create({
    data: { name, username, password: hashed, role: role ?? "staff" },
    select: { id: true, name: true, username: true, role: true },
  });
  return NextResponse.json(staff, { status: 201 });
}
