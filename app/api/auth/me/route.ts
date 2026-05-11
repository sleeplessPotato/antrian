import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await db.staff.findUnique({
    where: { id: session.staffId },
    select: { id: true, name: true, role: true, username: true },
  });

  return NextResponse.json(staff);
}
