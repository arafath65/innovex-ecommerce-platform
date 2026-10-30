
import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: ".env" });
loadDotEnv({ path: ".env.local", override: true });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});