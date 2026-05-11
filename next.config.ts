import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "better-sqlite3", "@prisma/adapter-better-sqlite3"],
  turbopack: {},
};

export default nextConfig;
