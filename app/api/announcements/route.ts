import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

function emitContentUpdated() {
  (global as any).io?.to("display").emit("content:updated");
}

export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "true";
  const announcements = await db.announcement.findMany({
    where: all ? undefined : { isActive: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const ann = await db.announcement.create({ data: body });
  emitContentUpdated();
  return NextResponse.json(ann, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...data } = await req.json();
  const ann = await db.announcement.update({ where: { id }, data });
  emitContentUpdated();
  return NextResponse.json(ann);
}
