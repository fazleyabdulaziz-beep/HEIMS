# HEIMS console-only diagnostics

The System Health navigation page and its backend health-check endpoint have been removed. No polling or scheduled checks run.

While signed in, open Chrome DevTools (F12) → Console and run:

```js
HEIMS_DIAG.run()
```

Available commands:

```js
HEIMS_DIAG.ping()       // One uncached dashboard API round-trip
HEIMS_DIAG.inventory()  // One uncached inventory API round-trip + item count
HEIMS_DIAG.run()        // Runs both checks sequentially and prints a table
```

These commands only run when manually entered. They do not start timers, background polling, write to Sheets, or log item records. Timings include browser/network/Apps Script response time. The inventory check downloads the inventory response to measure it, so use it only when needed.
