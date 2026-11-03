require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("../src/generated/prisma/client");

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
        const result = await prisma.$queryRawUnsafe("SELECT 1 AS connection_test");
        console.log("Database connection:", result);

        const storeCount = await prisma.store.count();
        console.log("Total stores:", storeCount);

        const domainCount = await prisma.store_domain.count();
        console.log("Total domain mappings:", domainCount);

        console.log("DATABASE TEST SUCCESSFUL");
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("DATABASE TEST FAILED:", error);
    process.exitCode = 1;
});
