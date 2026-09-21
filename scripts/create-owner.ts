
import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing from .env");
  }

  const parsedUrl = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.replace(/^\//, ""),
    connectionLimit: 2,
  });

  const prisma = new PrismaClient({ adapter });
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const store = await prisma.store.findUnique({
      where: { slug: "oscar-trading" },
    });

    if (!store) {
      throw new Error("Oscar Trading store was not found.");
    }

    const name = (await rl.question("Owner name: ")).trim();
    const email = (await rl.question("Owner email: ")).trim().toLowerCase();
    const password = await rl.question("Owner password (input visible): ");

    if (!name || !email || password.length < 12) {
      throw new Error(
        "Name and email are required. Use a password of at least 12 characters.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await prisma.storeUser.findUnique({
      where: {
        storeId_email: {
          storeId: store.id,
          email,
        },
      },
    });

    if (existing) {
      throw new Error(
        "A user with this email already exists for Oscar Trading. No changes made.",
      );
    }

    const owner = await prisma.storeUser.create({
      data: {
        storeId: store.id,
        name,
        email,
        passwordHash,
        role: "OWNER",
        isActive: true,
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    console.log("\nOwner account created:");
    console.log(owner);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nOwner setup failed:", error.message);
  process.exitCode = 1;
});