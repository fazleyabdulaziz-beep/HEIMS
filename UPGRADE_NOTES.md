# HEIMS improvements — installation notes

## Included changes
1. **Persistent sign-in:** after a successful login, HEIMS now automatically creates/refreshes the existing 30-day device sign-in token. Refreshing the page or closing/reopening the browser should return to the last app route without showing the login page. The Sign out button still clears the saved device token.
2. **Stock Orders:** a new navigation section lets supervisors/admins create purchase orders for existing inventory items, record supplier / PO reference / expected delivery date / notes, and track `ORDERED`, `PARTIAL`, `RECEIVED`, or `CANCELLED`. Orders do not change on-hand inventory until a receipt is recorded. Partial receipts are supported and only the received quantity is added to stock.

## Update an existing HEIMS deployment
1. Open the Google Sheet connected to HEIMS, then open **Extensions → Apps Script**.
2. Replace the existing backend code with `docs/appscripts/code.gs.txt` (or copy the updated backend changes into your existing script).
3. In the Apps Script editor, select and run **`upgradeOrdersSheet`** once. Approve permissions if prompted. This creates the `ORDERS` tab in your existing spreadsheet without changing current inventory.
4. Deploy the Apps Script web app using **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the same deployment URL used by `docs/js/config.js`.
5. Publish the updated `docs` folder to your GitHub Pages repository. The HTML asset version was bumped to `v=7` to refresh browser caches.
6. Sign in again if required. Test by creating a small stock order and receiving a partial quantity; confirm the on-hand quantity increases only by the received amount.

## Notes
- Creating, receiving, and cancelling orders is restricted to `ADMIN` and `SUPERVISOR` roles. Other roles can view the order register.
- The existing sign-in device token expires after 30 days and is revoked by Sign out, password reset, or account deactivation.
- If this is a brand-new HEIMS spreadsheet, run the normal `setup` function instead; it creates the `ORDERS` tab automatically. Do not run `setup` on an existing production spreadsheet.
\n\n## PWA Install App button (added)\n- Added an Install App button in the HEIMS header.\n- Added a web app manifest, 192px/512px icons, and a service worker for app-shell offline loading.\n- On supported browsers, the button opens the native install prompt. On iPhone/iPad, it explains Safari → Share → Add to Home Screen.\n- Deploy the complete updated `docs` folder to GitHub Pages over HTTPS. After deployment, refresh HEIMS once; the install option may take a reload or two to become available depending on the browser.\n

## Bulk QR PDF — 24 labels per A4
- Changed the PDF layout to 4 columns × 6 rows (24 labels per A4 page).
- Each QR remains 15 × 15 mm, with item name and item code alongside.
- Archived items remain excluded because bulk printing uses active inventory only.
- Deploy the updated `docs` folder to GitHub Pages. No Apps Script redeployment is required. Print at Actual Size / 100%.


## HEIMS Optimization V2
- Added Stock Verification dashboard and System Health Monitor (ADMIN / SUPERVISOR only).
- Added inventory search across item ID, name, brand, model and subcategory, plus sorting and result counts.
- Added QR scan beep/vibration feedback where supported and duplicate-scan suppression.
- Optimized item image loading/compression and changed Apps Script item updates to one batch row write.
- Backend code update is required. Back up Apps Script first, replace it with `docs/appscripts/code.gs.txt`, and deploy a new version. Do not run `setup()` on an existing spreadsheet.
- Confirm `STOCK_CHECKS` exists; run `upgradeStockChecksSheet()` only if it is missing. Existing inventory and transaction data are preserved.
- Upload the full updated `docs` folder to GitHub Pages.
- Static JavaScript / Apps Script syntax checks passed. Production Google Sheets, camera, audio/vibration and live latency still need verification after deployment.
