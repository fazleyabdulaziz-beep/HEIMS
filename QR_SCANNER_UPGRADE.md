# HEIMS QR Scanner Upgrade

## Included
- New QR Scanner navigation section for all signed-in roles.
- Mobile rear-camera QR scanning through html5-qrcode (Android Chrome and iOS Safari).
- Photo-based QR scan fallback and manual item search.
- QR labels generated per inventory item using the payload `HEIMS:<ItemID>`.
- Print-ready 70 mm × 35 mm item labels.
- Scanned item details with Stock In and Stock Out shortcuts.
- QR Label action in Inventory rows and item details.

## Deployment
1. Replace the GitHub Pages `docs` folder with the updated `docs` folder in this package.
2. Commit and wait for GitHub Pages to deploy.
3. Open HEIMS over HTTPS, refresh, and sign in.
4. Open QR Scanner and allow camera permission.
5. Print a test label from Inventory → QR Label before printing labels in bulk.

## Notes
- No Google Apps Script or Google Sheets schema changes are required.
- QR codes contain only the item ID; live quantity and other details are loaded from HEIMS after scanning.
- The QR scanner and QR generator libraries are loaded from jsDelivr, so an internet connection is needed to load those libraries.
- Camera access requires HTTPS and user permission. On iPhone, open HEIMS in Safari or the installed HEIMS PWA.
- Test the first label on the intended label printer; the print layout is set to 70 mm × 35 mm and can be adjusted for your label stock.
