# Innovex Ecommerce Platform

Multi-tenant ecommerce storefront and store administration platform built with Next.js, Prisma and MySQL.

## Local development

See [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) for Windows multi-domain testing with:

- `innovexweb.test` — Innovex platform hostname
- `oscar-trading.test` — Oscar Trading storefront
- `second-store.test` — another tenant (requires a second active store)

See [docs/PRODUCTION-DEPLOYMENT.md](docs/PRODUCTION-DEPLOYMENT.md) for VPS setup, persistent media storage, custom domain verification, HTTPS, backups and production checks.

## Basic commands

```powershell
npm install
npx prisma migrate dev
npx prisma generate
npm run seed:local-domains
npm run dev
```

Do not commit `.env`, `.env.local`, production credentials or uploaded media. Customer uploads use `MEDIA_STORAGE_ROOT`, which must point outside the application deployment directory.


## Production foundation status

The first foundation pass adds local hostname routing, verified store-domain mappings, persistent filesystem media outside the app release, tenant-scoped image upload/delete checks, security headers, a protected health endpoint, and local/production setup and backup guides. Read `docs/LOCAL-DEVELOPMENT.md` and `docs/PRODUCTION-DEPLOYMENT.md` before applying the migration or deploying.

Production DNS and TLS provisioning are still configured manually in CloudPanel. This project does not yet provide automated certificate provisioning, a distributed rate limiter, or object storage. Product-detail routing also needs a separate review before public launch.
