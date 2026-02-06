import path from "node:path";
import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";

export default defineConfig({
  // The path is relative to the prisma.config.ts file itself.
  schema: path.join(__dirname, "packages/data-sources/prisma/schema.prisma"),

  // Datasource URL resolved from environment with fallback for Docker builds
  datasource: {
    url: datasourceUrl,
  },

  migrations: {
    // The path is relative to the prisma.config.ts file.
    path: path.join(__dirname, "packages/data-sources/prisma/migrations"),
    seed: "tsx --tsconfig=packages/data-sources/prisma/tsconfig.seed.json packages/data-sources/prisma/seed.ts",
  },
});
