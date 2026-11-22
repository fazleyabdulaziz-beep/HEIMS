# HEIMS QR Stock Movement V5

## Changes
- Removed standalone Stock In and Stock Out navigation pages.
- Removed Stock In / Stock Out dashboard shortcuts; QR Stock Movement is the central entry point.
- Scanning a QR code (or selecting an item via manual search) opens the item result with direct Stock In / Stock Out actions.
- Added direct Stock Adjustment action for ADMIN and SUPERVISOR.
- Stock Check remains separate from Stock Adjustment and is labeled Stock Verification.
- After a successful movement, inventory is refreshed and the updated item result is shown.
- If the post-save refresh fails, the saved transaction is not re-submitted; the user is told to reload HEIMS.
- Updated asset query versions and service-worker cache version.

## Permissions preserved
- ADMIN / SUPERVISOR / TECHNICIAN: Stock In and Stock Out.
- ADMIN / SUPERVISOR: Stock Adjustment and Stock Verification.
- VIEWER: no stock movement controls.

## Existing backend actions reused
- stockIn
- stockOut
- adjustStock
- recordStockCheck

No Google Sheets schema or backend API changes are required.
