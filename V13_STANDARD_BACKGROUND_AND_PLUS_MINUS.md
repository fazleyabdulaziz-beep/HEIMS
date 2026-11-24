# HEIMS V13 — Standard background loading + − / + stock panel

## 1. One standard loading / saving function
- `bg(label, task, opts)` (docs/js/forms.js): shows the same pending toast (with spinner), runs the save in the
  background (screen stays usable), then turns that toast into success or failure. `opts.after` refreshes data silently.
- `modalBg(...)`: the form closes immediately, saving continues in the background. A `validate()` check (e.g. password
  mismatch) still keeps the form open with the error.
- `loadingHTML()`: one standard "Loading…" block for page / list loading.
- Converted to the standard: add/edit item, archive, restore, mark/clear ORDERED, add location, move items between racks,
  add/rename category, change password, add/edit user, reset password, save settings, stock adjustment.
- Backend untouched: Apps Script validation, role checks, script lock and duplicate-request guard are unchanged.

## 2. QR Stock In / Stock Out → − / + buttons
- After scanning (or searching) an item, the popup shows the live balance with a big − and + button.
- Tap + = Stock In, tap − = Stock Out. The balance changes instantly; each tap is saved in the background.
- Taps are queued and sent in order (one request per tap, each with its own request ID). Status line shows
  "Saving…" then "Saved ✓ … balance confirmed" using the balance returned by the server.
- "Per tap" chips: 1 / 5 / 10.
- − needs Staff name (pre-filled with the logged-in user) and Location used (remembered on the device).
- Over-withdrawing is blocked on screen and again by the server; failures show an error and roll the balance back.
- If the connection drops, the balance is re-checked from the server and the user is told to verify in Transaction History.
- Stock Adjustment (Admin/Supervisor) still has its own form, now saved in the background.

## Deploy
Replace GitHub Pages `docs` with this `HEIMS/docs`. No Apps Script change needed. Service-worker cache is bumped
(`heims-shell-v18-stepper`), so reload once online to pick up the new files.
