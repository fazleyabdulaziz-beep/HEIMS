# HEIMS V9 — Immediate Pending UI + Faster Item Lookup

## What changed
- Stock In/Out confirmation now uses a dedicated immediate-start callback.
- The form closes and the pending popup is inserted before the API request starts; the request is dispatched after two animation frames so the browser can paint the pending state first.
- Removed backdrop blur and entrance animations from the movement pending/success overlays to reduce rendering work.
- Apps Script `item_()` now locates the item by exact ID in column A and reads only the matching row rather than loading the entire ITEMS sheet.
- Removed redundant pre-write cache clearing; write caches are still invalidated after the operation.
- Added timing metadata to Apps Script responses and browser console logs:
  - `clientRoundTripMs`
  - `serverMs`
  - `lockWaitMs`
  - `lockWorkMs`

## Important integrity and safety notes
- Stock quantity validation remains server-side.
- Stock Out still validates available balance and requires staff/location.
- Stock In/Out still require server confirmation before the success popup appears.
- Global Script Lock is intentionally retained. Removing it without a safe per-item concurrency mechanism could allow two technicians to withdraw the same available stock at the same time.
- This version does not claim that Google Sheets commits in 0.5 seconds. It targets an immediate pending UI; actual server latency must be measured in the browser console.

## Deploy
1. Replace GitHub Pages `docs` with `HEIMS/docs` from this ZIP.
2. Replace Apps Script with `HEIMS/docs/appscripts/code.gs.txt`.
3. Deploy Apps Script as a New Version.
4. Hard-refresh the website / clear the old service-worker cache if the browser keeps old assets.

## Diagnose after deploy
Open browser DevTools → Console, perform one Stock In/Out, and inspect `[HEIMS API timing] stockIn` or `stockOut`.
- High `lockWaitMs`: another write is holding the global lock.
- High `lockWorkMs`: Sheets read/write work inside the lock is slow.
- Low `serverMs` but high `clientRoundTripMs`: network / Apps Script cold-start / browser connection delay.
