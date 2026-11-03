INNOVEX ECOMMERCE - REMOVE KITCHEN COMPANION
============================================

This update removes the three-card Kitchen Companion section from the storefront.
It preserves Flash Sale, New Arrivals, the existing editorial collection section,
and all other homepage components.

FILE TO REPLACE
---------------
src/app/HomeClient.tsx

CLEANUP
-------
After extracting this patch, remove the now-unused component and its images:

Remove-Item .\src\app\KitchenCompanion.tsx -Force -ErrorAction SilentlyContinue
Remove-Item .\public\kitchen-guides -Recurse -Force -ErrorAction SilentlyContinue

No database migration is required.
No changes are made to Flash Sale or New Arrivals data fetching.
