# HEIMS V7 — Faster Stock In / Stock Out

## Performance change
- Stock In and Stock Out now use the authoritative `qty` returned by the existing Apps Script mutation endpoint.
- The frontend updates the scanned item in its in-memory inventory list and opens the success popup immediately after the write response.
- Removed the second `inventory` API request (`load(true)`) that previously reloaded every inventory item after each movement.
- Full inventory is marked stale and will reload the next time a page requires fresh inventory data.
- Backend action, validation, role permissions, transaction logging, and duplicate-submission protection are unchanged.

## Deployment
Replace the GitHub Pages `docs` folder with this package's `HEIMS/docs` folder. No Apps Script redeployment or Google Sheets schema change is required.

## Validation
JavaScript syntax, QR asset version, service-worker cache version, and ZIP integrity checked. Live Apps Script / Google Sheets latency still needs to be measured after deployment.
