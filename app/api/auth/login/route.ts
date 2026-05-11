import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken, setCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const staff = await db.staff.findUnique({ where: { username } });
  if (!staff) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const valid = await verifyPassword(password, staff.password);
  if (!valid) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const token = signToken({ staffId: staff.id, role: staff.role });

  const res = NextResponse.json({
    staff: { id: staff.id, name: staff.name, role: staff.role, username: staff.username },
  });

  res.cookies.set(setCookieName(), token, {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
  });

  return res;
}
