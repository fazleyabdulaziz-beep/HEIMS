# HEIMS V8 — Immediate UI + Background Stock Write

## Frontend behavior
- Stock In / Stock Out immediately show a pending popup after Confirm; this is a UI acknowledgement, not a false success message.
- The Apps Script write request continues asynchronously while the popup is visible.
- Only after the backend confirms the write does the popup change to Stock In / Stock Out Successfully and show the authoritative balance.
- Server validation errors are shown in the popup. Network timeouts / connection loss are marked as unconfirmed because the server may have completed the write even if the response was lost; users are told to verify balance/history before retrying.
- The item in local inventory memory is updated from the confirmed API response; the entire inventory is not reloaded.

## Backend optimization
- Transaction IDs now use a Script Properties counter. Existing transaction IDs are scanned once when the counter is first initialized; later Stock In / Stock Out operations do not scan the full TRANSACTIONS ID column.
- The counter initialization and increments run under the existing script lock in `locked_()`.
- Existing stock validation, authorization, item update, transaction logging, and duplicate request ID guard remain in place.

## Important performance note
- The UI can acknowledge the click almost immediately (target under 0.5 seconds), but a confirmed Google Sheets write cannot be guaranteed within 0.5 seconds. Google Apps Script, network latency, sheet write latency, and script locking determine the actual completion time. The popup intentionally says `Request received` until the server confirms the transaction.

## Deployment
1. Replace GitHub Pages `docs/` with this package's `HEIMS/docs/`.
2. Replace the Apps Script project code with `docs/appscripts/code.gs.txt`, save, and deploy a new Apps Script web app version. Keep the same deployment URL in `docs/js/config.js`.
3. Reload HEIMS online to install the new service-worker cache.

## Validation
JavaScript syntax, backend syntax, asset versions, and ZIP integrity checked. Live latency must be measured in the deployed Apps Script / Google Sheets environment.
