# HEIMS Optimization V2

## Included
- Apps Script item-row updates now use one `setValues()` write instead of multiple `setValue()` calls.
- Backend cache invalidation now includes `STOCK_CHECKS`.
- Added Stock Verification dashboard based on the latest check per active item. It reports matched, quantity variance, item mismatch, system quantity unverified, and pending counts.
- System Health dashboard and automatic checks are intentionally not included; use manual console diagnostics only when needed.
- Inventory search now includes brand, model and subcategory; added sorting by name, item ID, rack or stock priority and a visible result count.
- QR scan feedback adds a short beep (where browser audio is allowed) and vibration (where supported), with duplicate-scan suppression.
- Item photos use lazy/async decoding and smaller thumbnails in transaction forms. New uploads are JPEG-compressed at a slightly lower quality.
- Updated static asset and service-worker cache versions.

## Backend deployment required
1. Back up the current Apps Script project.
2. Replace the Apps Script code with `docs/appscripts/code.gs.txt`.
3. Do NOT run `setup()` on an existing production spreadsheet.
4. Confirm `STOCK_CHECKS` exists. If it does not, run `upgradeStockChecksSheet()` once. Existing rows are preserved.
5. Deploy Apps Script as a new version, keeping the same Web App URL.

## Frontend deployment
Upload the complete `docs` folder to the existing GitHub Pages repository and commit. Refresh HEIMS; the service worker cache version has been bumped.

## New navigation
- Stock Verification: ADMIN and SUPERVISOR. Uses latest check per active item; pending means no stock-check record exists for that active item.
- Diagnostics: manual-only `HEIMS_DIAG` console commands; no health page, timer, polling or scheduled checks.

## Validation
JavaScript and Apps Script syntax checks should be run before deployment. Live Google Sheets, camera hardware, audio/vibration permissions and production transactions still require testing in the deployed hotel environment.


## System Health removal / console diagnostics
- Removed System Health from navigation and the client-side page router.
- Removed the getSystemHealth backend action to avoid an unnecessary endpoint.
- Added manual-only `HEIMS_DIAG` console helpers (`ping`, `inventory`, `run`).
- No timer, polling, periodic API call, or health dashboard is created.
See `CONSOLE_DIAGNOSTICS.md`.
