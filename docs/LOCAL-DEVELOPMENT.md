# Innovex local multi-domain development

## 1. Configure local hostnames (Windows)

Open PowerShell as Administrator, go to the project folder and run:

```powershell
.\scripts\add-local-hosts.ps1
```

The script adds these local-only entries to `C:\Windows\System32\drivers\etc\hosts`:

```text
127.0.0.1 innovexweb.test
127.0.0.1 www.innovexweb.test
127.0.0.1 admin.innovexweb.test
127.0.0.1 oscar-trading.test
127.0.0.1 second-store.test
```

These entries only direct the browser to your own PC. They do not create a store or domain mapping in MySQL.

## 2. Environment file

Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `MEDIA_STORAGE_ROOT` to the local values on your PC. The media root must be outside this project folder. The example uses `D:/InnovexData/media`; public files are stored below `D:/InnovexData/media/public/stores/...`.

Do not commit `.env.local`.

## 3. Apply schema and generate Prisma Client

After pulling these changes:

```powershell
npm install
npx prisma migrate dev
npx prisma generate
```

## 4. Connect the local test domains to stores

Run:

```powershell
npm run seed:local-domains
```

The script maps `oscar-trading.test` to the active store with slug `oscar-trading`. It maps `second-store.test` to an active store with slug `second-store`; if that default slug does not exist, it uses the first other active store. To select a particular second store, set `LOCAL_SECOND_STORE_SLUG` to that store's actual slug in `.env.local`. Create the second store first in Super Admin if it does not exist yet.

`innovexweb.test` is reserved for the Innovex platform landing page. It is not a tenant domain.

## 5. Start and test

```powershell
npm run dev
```

Open:

- `http://innovexweb.test:3000` — Innovex platform landing page
- `http://oscar-trading.test:3000` — Oscar Trading tenant
- `http://second-store.test:3000` — second tenant, once a second store exists and its domain record is seeded
- `http://localhost:3000` — development fallback using `STOREFRONT_STORE_SLUG`

On a mapped tenant domain, open `/admin/login` without a query string; the platform detects that tenant from the hostname. On the Innovex platform hostname, a store login can still be selected with `/admin/login?store=oscar-trading`.

The slug preview route remains available at `http://localhost:3000/oscar-trading`.
