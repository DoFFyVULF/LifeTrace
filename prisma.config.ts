import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"] ?? "postgresql://lifetrace:lifetrace_dev@localhost:5432/life_trace_dev",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
