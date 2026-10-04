
/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("./src/generated/prisma/client");

async function main() {
  const url = new URL(process.env.DATABASE_URL);

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
    const store = await prisma.store.findUnique({
      where: { slug: "oscar-trading" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    console.log("Prisma store result:", store);
  } catch (error) {
    console.error("Prisma query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
