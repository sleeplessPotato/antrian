import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "true";
  const ads = await db.advertisement.findMany({
    where: all ? undefined : { isActive: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(ads);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".pdf"].includes(ext)) {
    return NextResponse.json({ error: "Format harus JPG, PNG, atau PDF" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "ads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const last = await db.advertisement.findFirst({ orderBy: { order: "desc" } });
  const ad = await db.advertisement.create({
    data: {
      filename,
      originalName: file.name,
      type: ext === ".pdf" ? "pdf" : "image",
      order: (last?.order ?? 0) + 1,
    },
  });
  return NextResponse.json(ad, { status: 201 });
}
