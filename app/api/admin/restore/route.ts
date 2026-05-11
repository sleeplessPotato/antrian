import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { BACKUP_DIR, createDbBackup, restoreFromFile } from "@/lib/backup";
import { db } from "@/lib/db";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";

  let sourcePath: string;
  let isTempFile = false;

  try {
    if (contentType.includes("multipart/form-data")) {
      // Restore from uploaded file
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
      }
      if (!file.name.endsWith(".db")) {
        return NextResponse.json({ error: "File harus berekstensi .db" }, { status: 400 });
      }
      sourcePath = path.join(os.tmpdir(), `restore-${Date.now()}.db`);
      await writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));
      isTempFile = true;
    } else {
      // Restore from saved backup
      const { filename } = await req.json();
      if (!filename || !/^backup-[\dT\-]+\.db$/.test(filename)) {
        return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
      }
      sourcePath = path.join(BACKUP_DIR, filename);
    }

    // Create safety backup before restoring
    try { await createDbBackup(); } catch { /* non-fatal */ }

    // Disconnect Prisma to release file lock, restore, reconnect
    await db.$disconnect();
    await restoreFromFile(sourcePath);
    await db.$connect();

    return NextResponse.json({ ok: true, message: "Restore berhasil. Refresh semua tab browser." });
  } catch (err: any) {
    console.error("[POST /api/admin/restore]", err);
    // Try to reconnect even on failure
    try { await db.$connect(); } catch { /* ignore */ }
    return NextResponse.json({ error: err.message ?? "Restore gagal" }, { status: 500 });
  } finally {
    if (isTempFile) {
      try { await unlink(sourcePath!); } catch { /* ignore */ }
    }
  }
}
