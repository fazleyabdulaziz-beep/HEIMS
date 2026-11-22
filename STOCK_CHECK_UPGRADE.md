# HEIMS QR Stock Check upgrade

## What changed
- Adds a **Stock Check** action to the QR item popup for ADMIN and SUPERVISOR roles only.
- Requires the in-charge user to enter the physical counted quantity and confirm whether the real item matches the system name/photo/model.
- Saves system quantity, counted quantity, variance, item identity match, remarks, checker and timestamp in `STOCK_CHECKS`.
- Adds an audit-log entry for every stock check.
- Does **not** change inventory quantity. If there is a discrepancy, review it and use the existing Stock Adjustment workflow after verification.

## One-time Google Apps Script setup
1. Open the existing HEIMS Apps Script project.
2. Replace the backend with `docs/appscripts/code.gs.txt` from this ZIP and save.
3. In the Apps Script function selector, choose `upgradeStockChecksSheet` and click **Run** once.
4. Approve authorization if prompted. The function creates only the new `STOCK_CHECKS` sheet and does not modify existing inventory or transaction data.
5. Deploy > Manage deployments > Edit > **New version** > Deploy.

## GitHub Pages
1. Replace the existing GitHub Pages files with the contents of `docs/`.
2. Commit and push.
3. Refresh HEIMS. If installed as a PWA, close and reopen it once to allow the updated service worker to activate.

## Permissions and result meanings
- ADMIN and SUPERVISOR can record checks. TECHNICIAN and VIEWER cannot. The backend enforces this permission.
- `MATCHED`: item identity matches and physical count equals system quantity.
- `QTY_VARIANCE`: item identity matches but physical count differs.
- `ITEM_MISMATCH`: physical item does not match the system item description/photo/model.
- `SYSTEM_QTY_UNVERIFIED`: item identity matches, but the system quantity was blank.

Stock checks are records only; they never auto-adjust stock.
