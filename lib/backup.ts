import path from "path";
import { mkdir, readdir, unlink, stat } from "fs/promises";

export const BACKUP_DIR = path.join(process.cwd(), "backups");
const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");
const MAX_BACKUPS = 7;

export async function createDbBackup(): Promise<{ filename: string; filepath: string }> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${ts}.db`;
  const filepath = path.join(BACKUP_DIR, filename);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(filepath);
  db.close();

  return { filename, filepath };
}

export async function listBackups(): Promise<{ filename: string; size: number; createdAt: Date }[]> {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const files = await readdir(BACKUP_DIR);
    const backups = files
      .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
      .sort()
      .reverse();
    return await Promise.all(
      backups.map(async (f) => {
        const s = await stat(path.join(BACKUP_DIR, f));
        return { filename: f, size: s.size, createdAt: s.mtime };
      })
    );
  } catch {
    return [];
  }
}

export async function pruneOldBackups(): Promise<void> {
  const backups = await listBackups();
  await Promise.all(
    backups.slice(MAX_BACKUPS).map((b) =>
      unlink(path.join(BACKUP_DIR, b.filename)).catch(() => {})
    )
  );
}

export async function runAutoBackup(): Promise<void> {
  try {
    await createDbBackup();
    await pruneOldBackups();
    console.log(`[Backup] Auto-backup selesai: ${new Date().toISOString()}`);
  } catch (err) {
    console.error("[Backup] Auto-backup gagal:", err);
  }
}
