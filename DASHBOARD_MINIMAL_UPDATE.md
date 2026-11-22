# HEIMS Minimal Dashboard Update

Based on `HEIMS_console_diagnostics_only.zip` and backend `HEIMS_backend_optimized_v3.gs`.

## Dashboard behavior
- Four KPIs: Active Items, Low / Out Stock, role-specific pending count, Pending Orders.
- Needs Attention: up to five lowest-stock items, with OUT items first.
- Quick Actions: QR Scanner and Inventory for all users; Stock In/Out for ADMIN, SUPERVISOR, TECHNICIAN; Stock Verification for ADMIN/SUPERVISOR; Stock Orders for all signed-in users.
- TECHNICIAN and VIEWER see `Needs Initial Count` (items whose quantity is blank). ADMIN/SUPERVISOR see `Pending Verification` (active items without a recorded stock check).
- Removed dashboard category chart, stock distribution chart, recent activities, and Top 10 usage.

## Backend changes
- `dashboard_()` now returns only `kpi` and `lowList`.
- Pending stock verification and pending order counts use existing `STOCK_CHECKS` and `ORDERS` sheets with the V3 short-lived row cache.
- No Google Sheets columns, API action names, auth rules, or write operations changed.
- The stock-out transaction aggregation is no longer called by the dashboard, avoiding a full transaction-history scan on dashboard loads.

## Deployment
1. Replace Apps Script code with `HEIMS_backend_v3_dashboard.gs` (also included at `docs/appscripts/code.gs.txt`).
2. Deploy Apps Script as a new version.
3. Publish the `docs/` contents to the existing GitHub Pages branch/repository.
4. Reload the app; the service-worker cache was bumped to `heims-shell-v11-minimal-dashboard`.
