# HEIMS Performance Optimization V1

## Changes included

### Frontend
- Added short-lived in-memory caching for inventory, dashboard, transaction history, audit log, stock orders, user list, and settings reads.
- Added in-flight request deduplication so multiple identical requests share one network request.
- Automatically invalidates cached reads after successful or attempted write operations.
- Invalidates the in-memory inventory-loaded flag after mutations so inventory is refreshed when revisited.
- Inventory, Low Stock, and Rack sections reuse the current inventory snapshot instead of forcing a fresh download every time.
- Stock Orders no longer downloads the full inventory just to display the order list. Inventory is loaded only when the user starts creating an order.

### Google Apps Script backend
- Added a 15-second Script Cache for sheet snapshots used by read endpoints.
- USERS is intentionally excluded from caching so account activation and role changes are checked against the live sheet on every request.
- Sheet caches are cleared before and after write endpoints to prevent stale calculations and stale reads after changes.
- Oversized sheet snapshots are skipped safely rather than risking CacheService item-size errors.

### PWA / deployment
- Updated static asset version query strings and service-worker cache version so browsers fetch the optimized JavaScript rather than retaining the previous cached files.

## Deployment
1. Replace the contents of the Apps Script project with `docs/appscripts/code.gs.txt` (preserve any project-specific settings or helper code not included in this file).
2. Save and deploy Apps Script as a new version.
3. Upload the complete contents of `docs/` to the GitHub Pages repository, preserving folder structure.
4. Close the installed HEIMS app/browser tab and reopen it. If an old service worker remains active, reload once while online so the new shell cache installs.
5. Test Dashboard, Inventory, Stock In, Stock Out, Stock Orders, receiving an order, and switching sections.

## Notes
- Cache TTLs are intentionally short (12–30 seconds in the browser and 15 seconds for backend sheet snapshots).
- Data-changing API actions invalidate the frontend cache and backend sheet snapshots.
- This is a performance improvement, not a guarantee of a specific load time. Actual speed still depends on Google Apps Script execution time, spreadsheet size, network latency, and the device/browser.
