# HEIMS Bulk QR PDF — 24 labels per A4

- Bulk QR PDF layout is 4 columns × 6 rows (24 labels per A4 portrait page).
- Each QR remains physically 15 × 15 mm.
- Item name and item code remain beside the QR.
- Only selected active inventory items are included; archived items remain excluded.
- The PDF page is generated in A4 portrait. Print at Actual Size / 100% to preserve QR dimensions.

## Deploy
Replace the GitHub Pages `docs` folder with this updated `docs` folder and commit/push. No Apps Script or database changes are required. The QR script URL and service worker cache version have been bumped to refresh the updated PDF layout.
