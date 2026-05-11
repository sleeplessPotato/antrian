/**
 * End-to-end test: backup → mutate data → restore → verify data reverted
 */
import path from "path";
import fs from "fs";
import { createDbBackup, restoreFromFile, listBackups } from "../lib/backup";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");
const Database = require("better-sqlite3");

function countStaff(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true });
  const row = db.prepare("SELECT COUNT(*) as c FROM Staff").get() as any;
  db.close();
  return row.c;
}

function insertDummyStaff(dbPath: string): number {
  const db = new Database(dbPath);
  const res = db.prepare(
    "INSERT INTO Staff (name, username, password, role) VALUES ('TEST_RESTORE', 'test_restore_user', 'x', 'staff')"
  ).run();
  db.close();
  return res.lastInsertRowid as number;
}

function staffExists(dbPath: string, username: string): boolean {
  const db = new Database(dbPath, { readonly: true });
  const row = db.prepare("SELECT id FROM Staff WHERE username = ?").get(username) as any;
  db.close();
  return !!row;
}

function deleteStaff(dbPath: string, username: string) {
  const db = new Database(dbPath);
  db.prepare("DELETE FROM Staff WHERE username = ?").run(username);
  db.close();
}

async function main() {
  console.log("=== Backup & Restore Test ===\n");

  // Cleanup any leftover test staff
  if (staffExists(DB_PATH, "test_restore_user")) {
    deleteStaff(DB_PATH, "test_restore_user");
    console.log("Cleaned up leftover test staff");
  }

  // 1. Create backup BEFORE mutation
  const countBefore = countStaff(DB_PATH);
  console.log(`[1] Staff count before backup: ${countBefore}`);

  const { filename, filepath } = await createDbBackup();
  console.log(`[2] Backup created: ${filename} (${fs.statSync(filepath).size} bytes)`);

  // 2. Mutate database
  insertDummyStaff(DB_PATH);
  const countAfterMutate = countStaff(DB_PATH);
  console.log(`[3] Staff count after INSERT (mutation): ${countAfterMutate}`);
  console.log(`    test_restore_user exists: ${staffExists(DB_PATH, "test_restore_user")}`);

  if (countAfterMutate !== countBefore + 1) {
    throw new Error("Mutation did not work as expected");
  }

  // 3. Validate backup is a valid SQLite file
  const buf = Buffer.alloc(16);
  const fd = fs.openSync(filepath, "r");
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  const magic = buf.slice(0, 15).toString();
  console.log(`[4] Backup magic bytes: "${magic}"`);
  if (magic !== "SQLite format 3") throw new Error("Backup magic bytes invalid");
  console.log("    ✓ Valid SQLite database");

  // 4. Restore from backup
  await restoreFromFile(filepath);
  console.log(`[5] Restore completed`);

  // 5. Verify data reverted
  const countAfterRestore = countStaff(DB_PATH);
  console.log(`[6] Staff count after restore: ${countAfterRestore}`);
  console.log(`    test_restore_user exists: ${staffExists(DB_PATH, "test_restore_user")}`);

  if (countAfterRestore !== countBefore) {
    throw new Error(`Expected ${countBefore} staff after restore, got ${countAfterRestore}`);
  }
  if (staffExists(DB_PATH, "test_restore_user")) {
    throw new Error("test_restore_user should NOT exist after restore");
  }

  // 6. List backups
  const list = await listBackups();
  console.log(`\n[7] Backup files (${list.length}):`);
  list.forEach((b) => console.log(`    ${b.filename} — ${(b.size / 1024).toFixed(1)} KB`));

  console.log("\n✅ All tests passed. Backup and restore work correctly.");
}

main().catch((err) => {
  console.error("\n❌ Test FAILED:", err.message);
  process.exit(1);
});
