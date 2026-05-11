import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDbBackup, listBackups } from "@/lib/backup";
import { readFile } from "fs/promises";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listBackups());
}

export async function POST() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { filename, filepath } = await createDbBackup();
    const buf = await readFile(filepath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/backup]", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
