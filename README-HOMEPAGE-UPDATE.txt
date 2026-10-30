INNOVEX ECOMMERCE - HOMEPAGE UPDATE
==================================

This patch changes the storefront homepage only. It does not change the Prisma schema or require a database migration.

FILES INCLUDED
--------------
src/app/HomeClient.tsx
src/app/KitchenCompanion.tsx                 (new)
src/app/page.tsx                             (hostname-based storefront)
src/app/[storeSlug]/page.tsx                 (slug preview storefront)
public/kitchen-guides/cookware-guide.webp    (new)
public/kitchen-guides/organization-guide.webp (new)
public/kitchen-guides/care-guide.webp         (new)

WHAT CHANGED
------------
1. Replaced the old Featured Favourites grid with New Arrivals.
2. New Arrivals are queried separately from MySQL, ordered by createdAt descending,
   and limited to the latest 8 published and available products for that store.
3. Added The Kitchen Companion immediately below New Arrivals with three useful
   guides: Choose the Right Cookware, Smart Kitchen Organization, and Care for Your
   Kitchenware.
4. Each guide opens an in-page dialog with practical tips. The dialog can be closed
   with the close button, Escape key, or by clicking the backdrop.
5. Kitchen Companion is currently enabled for the Oscar Trading store slug only,
   so it does not appear on the It's You cosmetics storefront.
6. The change is store-scoped; it uses the current store's product data and theme
   primary color. No migration or seed operation is required.

APPLY
-----
1. Back up your current project.
2. Stop the Next.js dev server (Ctrl+C).
3. Extract this ZIP into the project root:
   C:\Users\Pradeep\Downloads\innovex-ecommerce-platform
   Allow the four source files to be overwritten and add the new files.
4. Start the app again with: npm run dev
5. Test:
   http://oscar-trading.test:3000
   http://second-store.test:3000

EXPECTED RESULT
---------------
Oscar Trading: Flash Sale (when active) -> New Arrivals -> The Kitchen Companion.
It's You: its normal homepage and product data, without the Kitchen Companion section.

No database migration is needed.
