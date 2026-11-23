# HEIMS V10 — Admin Inventory Stock Edit + Background Save

## User-facing changes
- Admin can edit the current stock quantity directly from Inventory > Edit.
- The stock quantity field is shown only to ADMIN. Supervisor and Technician roles do not receive this field.
- A reason is required only when the Admin changes the quantity.
- Stock edits are recorded as `STOCK_ADJUSTMENT` in TRANSACTIONS and as `ADMIN_STOCK_UPDATED` in AUDIT_LOG.
- Pressing Save closes the edit modal immediately and shows a persistent small bottom toast: `Saving changes…`.
- Saving runs in the background so the user can continue scrolling and using the inventory screen.
- The toast changes to `Changes saved successfully` when the server confirms, or `Save failed: ...` if the server rejects/fails.
- On successful edit, the visible inventory row is updated from the server response without a full inventory reload.

## Backend
- Added `adminUpdateItem` endpoint, restricted server-side to ADMIN.
- Item metadata and stock quantity are saved within the same Script Lock transaction.
- Existing `editItem` endpoint remains unchanged for Supervisor metadata edits and other current workflows.
- Stock adjustment requires a reason and is recorded in transaction and audit logs.

## Deploy
1. Replace GitHub Pages `docs` with `HEIMS/docs` from this ZIP.
2. Replace Apps Script source with `HEIMS/docs/appscripts/code.gs.txt`.
3. Deploy Apps Script as a New Version.
4. Hard refresh the site if the browser keeps old assets.

## Validation
- JavaScript syntax checks and Apps Script syntax check passed.
- Static checks confirm admin-only quantity UI, server-side ADMIN permission check, API route, and cache-busted service-worker assets.
- Live Google Sheets/API testing has not been performed in this environment.
