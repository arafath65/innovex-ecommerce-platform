import { config as loadDotEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

loadDotEnv({ path: ".env" });
loadDotEnv({ path: ".env.local", override: true });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed local domains in production.");
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing.");
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseHost = parsedUrl.hostname.toLowerCase();

  // Never allow this development script to write to a remote database.
  const allowedHosts = ["localhost", "127.0.0.1", "::1"];

  if (!allowedHosts.includes(databaseHost)) {
    throw new Error(
      `Safety check failed: ${databaseHost} is not a local database host.`
    );
  }

  const adapter = new PrismaMariaDb({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.replace(/^\//, ""),
    connectionLimit: 2,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const oscarSlug =
      process.env.LOCAL_OSCAR_STORE_SLUG ?? "oscar-trading";

    const secondSlug =
      process.env.LOCAL_SECOND_STORE_SLUG ?? "second-store";

    const oscarStore = await prisma.store.findFirst({
      where: {
        slug: oscarSlug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    const mappings = [
      {
        hostname: "oscar-trading.test",
        store: oscarStore,
      },
    ];

    let secondStore = await prisma.store.findFirst({
      where: {
        slug: secondSlug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    // When no store has the default second-store slug,
    // use another existing active store, if available.
    if (
      !secondStore &&
      (!process.env.LOCAL_SECOND_STORE_SLUG ||
        process.env.LOCAL_SECOND_STORE_SLUG === "second-store")
    ) {
      secondStore = await prisma.store.findFirst({
        where: {
          isActive: true,
          ...(oscarStore
            ? { id: { not: oscarStore.id } }
            : { slug: { not: oscarSlug } }),
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });
    }

    mappings.push({
      hostname: "second-store.test",
      store: secondStore,
    });

    let successCount = 0;

    for (const mapping of mappings) {
      if (!mapping.store) {
        console.warn(
          `SKIPPED ${mapping.hostname}: no matching active store exists.`
        );
        continue;
      }

      const existingDomain = await prisma.store_domain.findUnique({
        where: { hostname: mapping.hostname },
        select: {
          id: true,
          storeId: true,
        },
      });

      if (
        existingDomain &&
        existingDomain.storeId !== mapping.store.id
      ) {
        throw new Error(
          `${mapping.hostname} is already assigned to another store. ` +
          "Resolve the existing mapping before continuing."
        );
      }

      await prisma.store_domain.upsert({
        where: {
          hostname: mapping.hostname,
        },
        create: {
          storeId: mapping.store.id,
          hostname: mapping.hostname,
          status: "ACTIVE",
          isPrimary: false,
          verifiedAt: new Date(),
        },
        update: {
          storeId: mapping.store.id,
          status: "ACTIVE",
          verifiedAt: new Date(),
        },
      });

      console.log(
        `SUCCESS: ${mapping.hostname} -> ${mapping.store.name} (${mapping.store.slug})`
      );

      successCount++;
    }

    console.log("");
    console.log(`Local domain mappings created/verified: ${successCount}`);
    console.log(
      "innovexweb.test is reserved for the Innovex platform."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to seed local domains:", error);
  process.exitCode = 1;
});
