import "dotenv/config";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  const services = [
    { name: "Konsultasi Produk", nameEn: "Product Consultation", code: "KP", prefix: "A", order: 1 },
    { name: "Pengambilan Dokumen", nameEn: "Document Pickup", code: "PD", prefix: "B", order: 2 },
    { name: "Pengaduan", nameEn: "Complaint", code: "PG", prefix: "C", order: 3 },
    { name: "Pendaftaran", nameEn: "Registration", code: "REG", prefix: "D", order: 4 },
    { name: "Informasi Umum", nameEn: "General Information", code: "INFO", prefix: "E", order: 5 },
  ];

  for (const s of services) {
    await db.service.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  const counters = [
    { name: "Loket 1", code: "L1" },
    { name: "Loket 2", code: "L2" },
    { name: "Loket 3", code: "L3" },
  ];

  for (const c of counters) {
    await db.counter.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  const adminPassword = await bcrypt.hash("admin123", 12);
  await db.staff.upsert({
    where: { username: "admin" },
    update: {},
    create: { name: "Administrator", username: "admin", password: adminPassword, role: "admin" },
  });

  const staffPassword = await bcrypt.hash("petugas123", 12);
  await db.staff.upsert({
    where: { username: "petugas1" },
    update: {},
    create: { name: "Petugas 1", username: "petugas1", password: staffPassword, role: "staff" },
  });

  await db.announcement.createMany({
    data: [
      {
        text: "Selamat datang di BPOM Lubuklinggau. Mohon perhatikan nomor antrian Anda.",
        textEn: "Welcome to BPOM Lubuklinggau. Please pay attention to your queue number.",
        order: 1,
      },
      {
        text: "Harap menjaga ketertiban dan ketenangan selama menunggu.",
        textEn: "Please maintain order and silence while waiting.",
        order: 2,
      },
    ],
  });

  const settings = [
    { key: "avg_serve_minutes", value: "5" },
    { key: "voice_type", value: "tts" },
    { key: "queue_mode", value: "single" },
    { key: "office_name", value: "BPOM Lubuklinggau" },
  ];

  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log("Seed completed!");
  console.log("Admin: admin / admin123");
  console.log("Staff: petugas1 / petugas123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
