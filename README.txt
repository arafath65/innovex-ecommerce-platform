INNOVEX ECOMMERCE LINT FIX

This patch fixes the three ESLint errors reported after the homepage update:
1. Replaces internal <a> navigation with next/link in KitchenCompanion.tsx.
2. Replaces the platform Super Admin login <a> with next/link in app/page.tsx.
3. Refactors initial domain loading in StoreDetailsClient.tsx so the effect updates state only after the async request settles, avoiding synchronous setState in the effect.

It also passes the correct shop URL from each storefront entry point so the Kitchen Companion button works on both hostname-based storefronts (/shop) and slug-preview storefronts (/{storeSlug}/shop).

INSTALLATION
1. Stop the dev server (Ctrl+C).
2. Extract this ZIP directly into the project root:
   C:\Users\Pradeep\Downloads\innovex-ecommerce-platform
3. Allow the five files under src/ to be overwritten.
4. Run: npm run lint
5. Restart: npm run dev

No database migration or schema change is required.
