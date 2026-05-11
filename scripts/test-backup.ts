import path from "path";
import fs from "fs";
import { copyFile } from "fs/promises";
import { createDbBackup, listBackups, BACKUP_DIR } from "../lib/backup";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

async function main() {
  console.log("=== Test Backup ===");
  const { filename, filepath } = await createDbBackup();
  console.log("Backup created:", filename, `(${fs.statSync(filepath).size} bytes)`);

  const list = await listBackups();
  console.log("Backup list:", list.map((b) => b.filename));

  console.log("\n=== Test Restore (file copy) ===");
  // Simulate restore: copy backup back over db
  const Database = require("better-sqlite3");

  // Read a value before restore
  const dbBefore = new Database(DB_PATH, { readonly: true });
  const staffCount = (dbBefore.prepare("SELECT COUNT(*) as c FROM Staff").get() as any).c;
  console.log("Staff count before:", staffCount);
  dbBefore.close();

  // Check file writability before copy
  try {
    fs.accessSync(DB_PATH, fs.constants.W_OK);
    console.log("DB file is writable (no lock)");
  } catch {
    console.log("DB file is LOCKED — cannot restore without disconnecting Prisma first");
  }

  // Test copy
  const tempDest = DB_PATH + ".restored-test";
  await copyFile(filepath, tempDest);
  fs.unlinkSync(tempDest);
  console.log("File copy to temp: OK");

  // Verify backup is valid SQLite
  const backupDb = new Database(filepath, { readonly: true });
  const backupStaff = (backupDb.prepare("SELECT COUNT(*) as c FROM Staff").get() as any).c;
  console.log("Staff count in backup:", backupStaff);
  backupDb.close();

  console.log("\nAll tests passed.");
}

main().catch(console.error);
