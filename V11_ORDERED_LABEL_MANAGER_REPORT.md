# HEIMS V11 — Ordered Label + Combined Manager Report

## Simplified workflow
- Removed Stock Orders and Stock Verification from the app navigation, dashboard quick actions, QR item popup, and frontend routes.
- Removed the corresponding order and physical-stock-check API routes from the backend.
- Existing `ORDERS` and `STOCK_CHECKS` spreadsheet tabs, if present, are intentionally left untouched so historical data is not deleted.

## Ordered label
- Admin and Supervisor can mark an inventory item as `ORDERED` or clear the label directly from Inventory.
- No order quantity, supplier, PO number, or delivery date is requested.
- The `ORDERED` badge appears beside the item's stock status.
- Changes are saved to the `Ordered` column in the `ITEMS` sheet and recorded in `AUDIT_LOG`.
- Existing spreadsheets are migrated automatically: the backend adds the `Ordered` column to `ITEMS` on the first inventory/dashboard request. Existing rows default to blank/false.
- New spreadsheet setup includes the `Ordered` column and initializes it to FALSE.

## Manager report
- Added `Manager Report` section combining items with `LOW` or `OUT` stock status and items marked `ORDERED`.
- Items that are both low-stock and ordered appear once with both statuses.
- Report includes current quantity, minimum quantity, rack, stock status, order status, counts, prepared-by user, and generation date/time.
- `Generate Manager Report · Print / PDF` opens the browser print dialog; choose Save as PDF to send it to the manager.
- CSV export is also available.

## Roles
- Admin and Supervisor can set/clear the Ordered label.
- All signed-in roles can view and export the Manager Report.

## Deploy
1. Replace GitHub Pages `docs` with `HEIMS/docs` from this ZIP.
2. Replace Apps Script source with `HEIMS/docs/appscripts/code.gs.txt`.
3. Deploy Apps Script as a New Version.
4. Hard-refresh the website so the new service-worker cache is installed.

## Validation
- JavaScript syntax checked.
- Apps Script syntax checked.
- Static checks confirmed the removed UI/API routes are no longer referenced.
- ZIP integrity checked.
- Live Google Sheets/API testing has not been performed in this environment.
