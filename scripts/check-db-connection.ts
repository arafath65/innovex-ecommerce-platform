import dotenv from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing.");
  }

  const url = new URL(databaseUrl);

  console.log("Database target:", {
    host: url.hostname,
    port: Number(url.port || 3306),
    database: url.pathname.replace(/^\//, ""),
  });

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 2,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Testing database connection...");

    console.log(
      "Connection result:",
      await prisma.$queryRaw`SELECT 1 AS connection_test`
    );

    console.log("Store count:", await prisma.store.count());
    console.log("Domain count:", await prisma.store_domain.count());

    console.log("DATABASE TEST SUCCESSFUL");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("DATABASE TEST FAILED:", error);
  process.exitCode = 1;
});
