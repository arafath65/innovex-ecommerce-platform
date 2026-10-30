# Innovex production deployment foundation (Hostinger VPS / CloudPanel)

This repository is prepared for a single Next.js application serving multiple stores. Local development uses `.test` hostnames; production uses real customer domains mapped to `store_domain` records.

## Persistent server directories

Keep application code and customer uploads separate:

```text
/var/www/innovex-ecommerce/                 # deployed application
/var/lib/innovex-ecommerce/media/public/     # persistent public uploads
/var/backups/innovex-ecommerce/              # database and media backups
```

Configure the production environment (keep `ALLOW_SLUG_STOREFRONT_PREVIEW` unset or `false` so the old `/{storeSlug}` preview URLs cannot bypass custom-domain setup):

```env
NODE_ENV=production
DATABASE_URL=mysql://innovex_app:STRONG_PASSWORD@127.0.0.1:3306/innovex_ecommerce
APP_BASE_DOMAINS=innovexweb.lk,www.innovexweb.lk,admin.innovexweb.lk
ALLOW_SLUG_STOREFRONT_PREVIEW=false
MEDIA_STORAGE_ROOT=/var/lib/innovex-ecommerce/media
```

Use a dedicated MySQL database user with access only to this application's database. Do not use the MySQL root account in `DATABASE_URL`.

## First deployment

1. Create the persistent media and backup directories.
2. Give the Linux account that runs Next.js write access to the media directory, but do not make the directory world-writable.
3. Configure the application environment in CloudPanel or the process manager.
4. Install dependencies with `npm ci`.
5. Run `npx prisma migrate deploy` and `npx prisma generate`.
6. Run `npm run build`.
7. Start the app with `npm run start` behind the reverse proxy.
8. Configure Nginx/CloudPanel to forward the original `Host` header to Next.js and set the maximum request body size to cover the allowed image uploads.
9. Configure DNS and HTTPS for `innovexweb.lk` and the tenant domains.

Do not enable a tenant hostname in the `store_domain` table until domain ownership is verified and HTTPS is ready at the reverse proxy/CDN. The application currently verifies ownership by a TXT record; certificate provisioning remains an infrastructure operation. After activation, store owners can open `/admin/login` directly on their mapped custom domain; hostname mapping supplies the store context.

## Domain onboarding

For a customer domain, add it to the correct store through the Super Admin domain API. The API returns the TXT record name and value. The owner adds that TXT record at their DNS provider. Call the domain verification endpoint; it changes the record to `VERIFIED`. After HTTPS is provisioned and the reverse proxy accepts the host, activate it. Only `ACTIVE` domains resolve a store at the root URL.

The A/CNAME target values depend on the VPS public IP and chosen DNS design. Configure them in the customer DNS provider; do not hardcode an IP in the app. For a typical setup, point the apex/root domain with an A record to the VPS IPv4 address and point `www` with a CNAME to the apex hostname (or use the DNS provider's ALIAS/ANAME feature for the apex where appropriate). Add both apex and `www` as separate hostnames if both should serve the store. Then add each hostname to the CloudPanel site/reverse proxy, issue HTTPS certificates, verify the TXT record in Super Admin, and activate the hostname.

## Backups and restore

Back up both MySQL and `/var/lib/innovex-ecommerce/media/` (which contains the `public/stores/...` upload tree). They must be backed up together because database image URLs refer to files in the media directory. Keep off-server copies and test a restore before accepting real customer orders. The repository includes `scripts/backup-production.sh`; configure `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MEDIA_STORAGE_ROOT` and `BACKUP_ROOT`, then schedule it with cron.

## Operational safeguards before public launch

- Use a process manager/service with automatic restart and log rotation.
- Keep `.env` secrets out of Git and restrict file permissions.
- Keep the OS, Node.js and dependencies patched.
- Restrict MySQL to localhost/private networking.
- Configure firewall rules for only required ports.
- Monitor disk space, memory, application errors and database health.
- Configure automated database and media backups with retention.
- Test restore, order submission, image upload/delete, custom host routing and tenant isolation using two different stores.
- Configure CloudPanel/Nginx upload limits and request timeouts to match the application's upload limits.
- Apply reverse-proxy rate limits to `/api/auth/login` and `/api/super-admin/login`; the app does not yet include a distributed rate limiter.
- Restrict direct access to the Node.js port so public traffic reaches the app only through the configured reverse proxy, which must forward the original `Host` header.

## Current storage scaling decision

The current local filesystem provider is appropriate for the initial single-VPS deployment. It stores files outside the code release so redeployments do not erase them. Before adding multiple application servers, moving media to a shared object store such as R2 will be needed; a local disk is not shared automatically between servers.

## Known application work still required before public launch

This foundation does not complete every storefront feature. In the uploaded source, `src/app/product/[slug]/page.tsx` currently contains a client-side product-management screen rather than a customer-facing product detail page. Review and replace that route before enabling real customer traffic. Also complete a full lint/build/test run on the Windows development machine after generating the Prisma Client.
