import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { BACKUP_DIR } from "@/lib/backup";
import { readFile, unlink } from "fs/promises";
import path from "path";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

function safePath(filename: string): string | null {
  if (!/^backup-[\dT\-]+\.db$/.test(filename)) return null;
  return path.join(BACKUP_DIR, filename);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { filename } = await params;
  const filepath = safePath(filename);
  if (!filepath) return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  try {
    const buf = await readFile(filepath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { filename } = await params;
  const filepath = safePath(filename);
  if (!filepath) return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  try {
    await unlink(filepath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
