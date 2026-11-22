/* HEIMS QR Scanner + QR label printing. Camera scanning uses html5-qrcode (ZXing) for Android/iOS Safari support. */
let heimsQRScanner = null;
let heimsQRRunning = false;
let heimsQRLastValue = '';
let heimsQRLastAt = 0;
let heimsQRHandling = false;
function qrSuccessFeedback() {
  try { if (navigator.vibrate) navigator.vibrate([70, 35, 70]); } catch (_) {}
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ctx = new AC(); ctx.resume().catch(() => {}); const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = 880; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.14); osc.onended = () => ctx.close(); } catch (_) {}
}
window.QR_SELECTED_ITEM = null;

async function stopQRScanner() {
  if (!heimsQRScanner || !heimsQRRunning) return;
  try { await heimsQRScanner.stop(); } catch (_) {}
  try { heimsQRScanner.clear(); } catch (_) {}
  heimsQRRunning = false;
  heimsQRScanner = null;
}

async function vQR() {
  await load(false);
  $('#view').innerHTML = `<div class="qr-layout">
    <section class="card qr-scan-card">
      <div class="qr-card-head"><div><h3>Scan spare-part QR</h3><p class="mut sm">Point your phone camera at a HEIMS item label.</p></div><span class="b ok">Mobile ready</span></div>
      <div id="qr-reader" class="qr-reader"><div class="qr-placeholder"><span class="qr-placeholder-icon">▦</span><b>Camera scanner</b><span class="mut sm">Tap Start Camera and allow camera access.</span></div></div>
      <div class="qr-controls"><button class="btn" id="qr-start">Start Camera</button><button class="btn g" id="qr-stop" disabled>Stop Camera</button><label class="btn g qr-file-label" for="qr-file">Scan from photo</label><input id="qr-file" type="file" accept="image/*" capture="environment" hidden></div>
      <p id="qr-camera-status" class="mut sm" aria-live="polite">Camera access requires HTTPS and permission from your browser.</p>
    </section>
    <section class="card qr-lookup-card"><h3>Find item manually</h3><p class="mut sm">Use this if camera access is unavailable.</p><input id="qr-search" placeholder="Search item ID or name…" autocomplete="off"><div id="qr-search-results" class="qr-search-results"><span class="mut sm">Type an item ID or name.</span></div></section>
  </div><section id="qr-item-result" class="qr-item-result" aria-live="polite"></section>
  <p class="mut sm qr-footnote">Tip: Print labels from Inventory → QR Label. Each code contains the HEIMS item ID only; it does not contain stock quantities or personal data.</p>`;
  $('#qr-start').onclick = startQRScanner;
  $('#qr-stop').onclick = stopQRScanner;
  $('#qr-file').onchange = scanQRFile;
  $('#qr-search').oninput = drawQRSearch;
}

async function startQRScanner() {
  const status = $('#qr-camera-status');
  if (!window.isSecureContext) { status.textContent = 'Camera needs a secure HTTPS connection. Open HEIMS using its GitHub Pages HTTPS address.'; return; }
  if (typeof Html5Qrcode === 'undefined') { status.textContent = 'Scanner library did not load. Check your internet connection, then refresh HEIMS.'; return; }
  $('#qr-start').disabled = true;
  status.textContent = 'Requesting camera permission…';
  try {
    await stopQRScanner();
    $('#qr-reader').innerHTML = '';
    heimsQRScanner = new Html5Qrcode('qr-reader', { verbose: false });
    await heimsQRScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => {
      const side = Math.max(160, Math.min(260, Math.floor(Math.min(w, h) * .72))); return { width: side, height: side };
    }, aspectRatio: 1.0, disableFlip: false }, decoded => onQRDecoded(decoded), () => {});
    heimsQRRunning = true;
    $('#qr-stop').disabled = false;
    status.textContent = 'Camera active. Hold the QR label steady inside the scan frame.';
  } catch (err) {
    heimsQRScanner = null; heimsQRRunning = false;
    status.textContent = (err && err.message) ? err.message : 'Could not start camera. Check browser camera permission.';
    toast('Unable to start camera scanner', 'bad');
  } finally { $('#qr-start').disabled = false; }
}

async function scanQRFile(e) {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  if (typeof Html5Qrcode === 'undefined') { toast('QR scanner library did not load. Check internet and refresh.', 'bad'); return; }
  const status = $('#qr-camera-status'); status.textContent = 'Reading QR code from image…';
  try {
    await stopQRScanner();
    heimsQRScanner = new Html5Qrcode('qr-reader', { verbose: false });
    const decoded = await heimsQRScanner.scanFile(file, true);
    await heimsQRScanner.clear(); heimsQRScanner = null;
    status.textContent = 'QR code found in image.'; onQRDecoded(decoded);
  } catch (err) {
    try { if (heimsQRScanner) await heimsQRScanner.clear(); } catch (_) {}
    heimsQRScanner = null; status.textContent = 'No readable QR code found in that photo.'; toast('Could not read QR image', 'bad');
  } finally { e.target.value = ''; }
}

function parseHEIMSQR(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try { const u = new URL(value); return u.searchParams.get('item') || u.searchParams.get('itemId') || ''; } catch (_) {}
  }
  const m = value.match(/^HEIMS\s*[:|]\s*(.+)$/i);
  return (m ? m[1] : value).trim();
}

async function onQRDecoded(raw) {
  const itemId = parseHEIMSQR(raw);
  if (!itemId) { toast('This QR code does not contain a HEIMS item ID', 'bad'); return; }
  const now = Date.now();
  if (heimsQRHandling || (heimsQRLastValue.toLowerCase() === itemId.toLowerCase() && now - heimsQRLastAt < 2500)) return;
  heimsQRHandling = true;
  try {
    if (heimsQRRunning) await stopQRScanner();
    const item = S.items.find(i => String(i.ItemID).toLowerCase() === itemId.toLowerCase());
    heimsQRLastValue = itemId; heimsQRLastAt = now;
    if (!item) {
      $('#qr-item-result').innerHTML = `<div class="card empty">No active inventory item matches <b>${esc(itemId)}</b>. Check the label or search manually.</div>`;
      $('#qr-camera-status').textContent = 'QR read complete. Item not found in active inventory.';
      return;
    }
    qrSuccessFeedback();
    showQRItemResult(item);
    $('#qr-camera-status').textContent = `Found ${item.ItemID} — ${item.Name}`;
  } finally { heimsQRHandling = false; }
}

function showQRItemResult(i) {
  // A scan/search result is shown as a focused pop-up so technicians can identify
  // the physical spare part by its photo before recording a movement.
  document.querySelectorAll('.qr-item-overlay').forEach(el => el.remove());
  const quantity = i.Quantity === '' ? 'Not counted' : `${esc(i.Quantity)} ${esc(i.Unit)}`;
  const image = i.ImageURL
    ? `<img class="qr-item-photo" decoding="async" fetchpriority="high" src="${esc(imgUrl(i.ImageURL, 800))}" alt="${esc(i.Name)}">`
    : `<div class="qr-item-photo qr-item-no-photo">${NOPIC}<span>No item photo</span></div>`;
  const overlay = document.createElement('div');
  overlay.className = 'ov qr-item-overlay';
  overlay.innerHTML = `<section class="card qr-found-modal" role="dialog" aria-modal="true" aria-label="Found inventory item">
    <div class="qr-pop-head"><span class="b ok">ITEM FOUND</span><button class="btn g sm" type="button" data-qr-close aria-label="Close item details">✕</button></div>
    ${image}
    <div class="qr-pop-body"><div class="qr-found-main"><div><h3>${esc(i.Name)}</h3><span class="id">${esc(i.ItemID)}</span></div>${badge(i.st)}</div>
      <div class="qr-details"><span><small class="mut">Current quantity</small><b>${quantity}</b></span><span><small class="mut">Rack / location</small><b>${esc(i.Rack || '-')}</b></span><span><small class="mut">Category</small><b>${esc(i.Category || '-')}</b></span><span><small class="mut">Minimum stock</small><b>${esc(i.MinStock ?? 0)} ${esc(i.Unit || '')}</b></span></div>
      <div class="qr-actions"><button class="btn" data-qr-move="in" data-item="${esc(i.ItemID)}">Stock In</button><button class="btn" data-qr-move="out" data-item="${esc(i.ItemID)}">Stock Out</button>${can('ADMIN','SUPERVISOR') ? `<button class="btn g qr-check-btn" data-qr-stock-check="${esc(i.ItemID)}">Stock Check</button>` : ''}<button class="btn g" data-qr-label="${esc(i.ItemID)}">Print QR Label</button></div>
    </div></section>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-qr-close]')) overlay.remove();
  });
  document.body.append(overlay);
  $('#qr-item-result').innerHTML = '';
}

function openQRStockCheck(itemId) {
  if (!can('ADMIN', 'SUPERVISOR')) { toast('Only Admin or Supervisor can record a stock check.', 'bad'); return; }
  const i = S.items.find(x => x.ItemID === itemId);
  if (!i) { toast('Item not found. Refresh inventory and scan again.', 'bad'); return; }
  const systemQty = i.Quantity === '' ? 'Not counted in system' : `${esc(i.Quantity)} ${esc(i.Unit || '')}`;
  modal('Physical Stock Check', `<div class="qr-check-item">${i.ImageURL ? `<img src="${esc(imgUrl(i.ImageURL, 240))}" alt="${esc(i.Name)}">` : `<div class="qr-check-no-photo">${NOPIC}</div>`}<div><b>${esc(i.Name)}</b><small class="mut">${esc(i.ItemID)} · ${esc(i.Rack || '-')}</small><small class="mut">System quantity: <strong>${systemQty}</strong></small></div></div>
    <p class="mut sm">Physically inspect the spare part and count the actual quantity. This check records a report only; it will not change stock balance.</p>
    <div class="fg">${fld('countedQty', `Physical quantity counted (${esc(i.Unit || 'units')}) *`, '', 'type=number min=0 step=any required')}${sel('identityMatch', 'Does the real item match the system name / photo / model? *', ['YES','NO'], 'YES')}${fld('notes', 'Remarks (optional)', '', 'maxlength=300')}</div>`, 'Save Stock Check', async d => {
      const r = await api('recordStockCheck', { itemId: i.ItemID, countedQty: d.countedQty, identityMatch: d.identityMatch, notes: d.notes, rid: rid() });
      const varianceText = r.variance === '' ? 'System quantity has not been verified yet.' : (Number(r.variance) === 0 ? 'Physical quantity matches system.' : `Quantity difference: ${r.variance} ${i.Unit || ''}.`);
      const label = r.result === 'MATCHED' ? 'MATCHED' : r.result === 'ITEM_MISMATCH' ? 'ITEM MISMATCH' : r.result === 'QTY_VARIANCE' ? 'QUANTITY VARIANCE' : 'SYSTEM QTY UNVERIFIED';
      toast(`Stock check saved: ${label}. ${varianceText}`, r.result === 'MATCHED' ? 'ok' : 'bad');
    });
}

function drawQRSearch() {
  const q = $('#qr-search').value.trim().toLowerCase(), target = $('#qr-search-results');
  if (!q) { target.innerHTML = '<span class="mut sm">Type an item ID or name.</span>'; return; }
  const found = S.items.filter(i => String(i.ItemID).toLowerCase().includes(q) || String(i.Name).toLowerCase().includes(q)).slice(0, 8);
  target.innerHTML = found.length ? found.map(i => `<button class="qr-search-hit" data-qr-open="${esc(i.ItemID)}"><span><b>${esc(i.Name)}</b><small class="mut">${esc(i.ItemID)} · ${esc(i.Rack)}</small></span>${badge(i.st)}</button>`).join('') : '<span class="mut sm">No matching items.</span>';
}


/* ---------- Bulk QR label printing (active items only) ---------- */
let bulkQRSelected = new Set();
function openBulkQRPrint() {
  // Deliberately use S.items only. Archived records in S.archived are never offered for bulk printing.
  const active = Array.isArray(S.items) ? S.items : [];
  if (!active.length) { toast('No active inventory items available to print.', 'bad'); return; }
  bulkQRSelected = new Set();
  const m = document.createElement('div'); m.className = 'ov bulk-qr-overlay'; m.id = 'bulk-qr-modal';
  m.innerHTML = `<section class="card bulk-qr-modal" role="dialog" aria-modal="true" aria-label="Bulk QR label printing">
    <div class="qr-label-head"><div><h3>Bulk QR Label Printing</h3><p class="mut sm">Select only the active spare parts you want to print. Archived items are excluded.</p></div><button class="btn g sm" type="button" data-bulk-close>Close</button></div>
    <input id="bulk-qr-search" type="search" placeholder="Search active item ID or name…" autocomplete="off">
    <div class="bulk-qr-tools"><button class="btn g sm" type="button" id="bulk-qr-select-visible">Select visible</button><button class="btn g sm" type="button" id="bulk-qr-clear">Clear selection</button><span class="mut sm" id="bulk-qr-count">0 selected</span></div>
    <div class="bulk-qr-list" id="bulk-qr-list"></div>
    <div class="mf"><span class="mut sm">Only selected active items will be printed.</span><button class="btn" type="button" id="bulk-qr-print" disabled>Download PDF (24 per A4)</button></div>
  </section>`;
  document.body.append(m);
  const list = m.querySelector('#bulk-qr-list');
  const render = () => {
    const q = m.querySelector('#bulk-qr-search').value.trim().toLowerCase();
    const matches = active.filter(i => String(i.ItemID || '').toLowerCase().includes(q) || String(i.Name || '').toLowerCase().includes(q));
    list.innerHTML = matches.length ? matches.map(i => `<label class="bulk-qr-row"><input type="checkbox" data-bulk-qr-item="${esc(i.ItemID)}" ${bulkQRSelected.has(i.ItemID) ? 'checked' : ''}><span class="bulk-qr-row-name"><b>${esc(i.Name)}</b><small class="mut">${esc(i.ItemID)} · ${esc(i.Rack || 'No rack assigned')}</small></span></label>`).join('') : '<div class="empty">No active items match your search.</div>';
    m.querySelector('#bulk-qr-count').textContent = `${bulkQRSelected.size} selected · ${active.length} active items available`;
    m.querySelector('#bulk-qr-print').disabled = bulkQRSelected.size === 0;
  };
  m.addEventListener('click', e => {
    if (e.target === m || e.target.closest('[data-bulk-close]')) m.remove();
    if (e.target.closest('#bulk-qr-select-visible')) { list.querySelectorAll('[data-bulk-qr-item]').forEach(c => bulkQRSelected.add(c.dataset.bulkQrItem)); render(); }
    if (e.target.closest('#bulk-qr-clear')) { bulkQRSelected.clear(); render(); }
    if (e.target.closest('#bulk-qr-print')) printBulkQRLabels(active.filter(i => bulkQRSelected.has(i.ItemID)), m);
  });
  m.addEventListener('change', e => {
    const c = e.target.closest('[data-bulk-qr-item]'); if (!c) return;
    if (c.checked) bulkQRSelected.add(c.dataset.bulkQrItem); else bulkQRSelected.delete(c.dataset.bulkQrItem);
    m.querySelector('#bulk-qr-count').textContent = `${bulkQRSelected.size} selected · ${active.length} active items available`;
    m.querySelector('#bulk-qr-print').disabled = bulkQRSelected.size === 0;
  });
  m.querySelector('#bulk-qr-search').addEventListener('input', render);
  render();
}

async function makeBulkQRData(itemId) {
  const host = document.createElement('div'); host.className = 'bulk-qr-temp';
  document.body.append(host);
  try {
    new QRCode(host, { text: `HEIMS:${itemId}`, width: 600, height: 600, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    await new Promise(resolve => setTimeout(resolve, 35));
    const canvas = host.querySelector('canvas'), img = host.querySelector('img');
    if (canvas) return canvas.toDataURL('image/png');
    if (img && img.complete) return img.src;
    if (img) return await new Promise((resolve, reject) => { img.onload = () => resolve(img.src); img.onerror = reject; });
    throw new Error(`Could not generate QR for ${itemId}`);
  } finally { host.remove(); }
}

async function printBulkQRLabels(items, modalNode) {
  if (!items.length) return;
  if (typeof QRCode === 'undefined') { toast('QR generator unavailable. Check internet and refresh.', 'bad'); return; }
  const JsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!JsPDF) { toast('PDF generator unavailable. Check internet and refresh.', 'bad'); return; }
  const btn = modalNode.querySelector('#bulk-qr-print');
  btn.disabled = true;
  btn.textContent = 'Generating PDF…';
  try {
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: 'HEIMS QR Inventory Labels', subject: 'Selected active inventory QR labels', author: 'HEIMS - Hotel Engineering' });

    // A4: 4 columns x 6 rows = exactly 24 labels per page.
    // Each QR is physically 15 x 15 mm, with only item name and item ID beside it.
    const pageW = 210, pageH = 297;
    const marginX = 7, marginY = 7;
    const cols = 4, rows = 6;
    const cellW = (pageW - marginX * 2) / cols;
    const cellH = (pageH - marginY * 2) / rows;
    const qrSize = 15;
    const qrInsetX = 2.2;
    const textGap = 1.8;
    const textXOffset = qrInsetX + qrSize + textGap;
    const textW = cellW - textXOffset - 2;

    for (let index = 0; index < items.length; index++) {
      if (index > 0 && index % (cols * rows) === 0) doc.addPage('a4', 'portrait');
      const item = items[index];
      const src = await makeBulkQRData(item.ItemID);
      const slot = index % (cols * rows);
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      // Very light cut guide; dark text and QR remain high contrast.
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.15);
      doc.rect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);

      const qrX = x + qrInsetX;
      const qrY = y + (cellH - qrSize) / 2;
      doc.addImage(src, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');

      const textX = x + textXOffset;
      const maxTextW = textW;
      const itemName = String(item.Name || 'Unnamed item');
      const itemCode = String(item.ItemID || '');
      let nameSize = 9.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(nameSize);
      let nameLines = doc.splitTextToSize(itemName, maxTextW);
      if (nameLines.length > 3) {
        nameSize = 8.5;
        doc.setFontSize(nameSize);
        nameLines = doc.splitTextToSize(itemName, maxTextW);
      }
      if (nameLines.length > 4) nameLines = [...nameLines.slice(0, 3), `${nameLines[3].slice(0, Math.max(1, nameLines[3].length - 1))}…`];

      const nameLineH = nameSize * 0.42;
      const codeSize = 8.7;
      const blockH = nameLines.length * nameLineH + 2.2 + codeSize * 0.42;
      let textY = y + (cellH - blockH) / 2 + nameSize * 0.36;
      doc.setTextColor(12, 18, 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(nameSize);
      doc.text(nameLines, textX, textY, { lineHeightFactor: 1.08, maxWidth: maxTextW });

      textY += nameLines.length * nameLineH + 2.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(codeSize);
      doc.setTextColor(0, 0, 0);
      const codeLines = doc.splitTextToSize(itemCode, maxTextW);
      doc.text(codeLines.slice(0, 2), textX, textY, { lineHeightFactor: 1.05, maxWidth: maxTextW });
    }

    const dateTag = new Date().toISOString().slice(0, 10);
    doc.save(`HEIMS-QR-Labels-${dateTag}.pdf`);
    modalNode.remove();
    toast(`${items.length} active item QR labels exported to PDF.`, 'ok');
  } catch (err) {
    console.error('Bulk QR PDF error:', err);
    toast(err.message || 'Could not generate QR PDF. Please try again.', 'bad');
    btn.disabled = false;
    btn.textContent = 'Download PDF (24 per A4)';
  }
}

function showQRLabel(itemId) {
  const i = S.items.find(x => x.ItemID === itemId) || (S.archived || []).find(x => x.ItemID === itemId);
  if (!i) { toast('Item not found. Refresh inventory and try again.', 'bad'); return; }
  const m = document.createElement('div'); m.className = 'ov qr-label-overlay';
  m.innerHTML = `<div class="card qr-label-modal"><div class="qr-label-head"><div><h3>QR Item Label</h3><p class="mut sm">Print and attach this label to the spare-part bin.</p></div><button class="btn g sm" data-x>Close</button></div>
    <div class="qr-label-preview"><div id="qr-label-code"></div><div class="qr-label-text"><b>${esc(i.Name)}</b><strong>${esc(i.ItemID)}</strong><span>${esc(i.Rack || 'No rack assigned')}</span><small>HEIMS · Hotel Engineering</small></div></div>
    <p class="mut sm">The QR code stores only the item ID. Quantity is always retrieved live from HEIMS after scanning.</p>
    <div class="mf"><button class="btn g" data-x>Cancel</button><button class="btn" id="qr-label-print">Print Label</button></div></div>`;
  document.body.append(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  const code = m.querySelector('#qr-label-code');
  if (typeof QRCode === 'undefined') { code.textContent = 'QR generator unavailable. Check internet and refresh.'; m.querySelector('#qr-label-print').disabled = true; return; }
  new QRCode(code, { text: `HEIMS:${i.ItemID}`, width: 180, height: 180, colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  m.querySelector('#qr-label-print').onclick = () => printQRLabel(i, code);
}

function printQRLabel(i, codeNode) {
  const canvas = codeNode.querySelector('canvas');
  const img = codeNode.querySelector('img');
  let src = '';
  try { src = canvas ? canvas.toDataURL('image/png') : (img ? img.src : ''); } catch (_) {}
  if (!src) { toast('QR code is not ready to print. Try again.', 'bad'); return; }
  let root = document.getElementById('qr-print-root');
  if (root) root.remove();
  root = document.createElement('div'); root.id = 'qr-print-root';
  root.innerHTML = `<div class="print-qr-label"><img src="${src}" alt="QR code for ${esc(i.ItemID)}"><div><b>${esc(i.Name)}</b><strong>${esc(i.ItemID)}</strong><span>${esc(i.Rack || 'No rack assigned')}</span><small>HEIMS · Hotel Engineering</small></div></div>`;
  document.body.append(root);
  const cleanup = () => { root.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 120);
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'bulk-qr-open') { openBulkQRPrint(); return; }
  if (b.dataset.qrOpen) { const i = S.items.find(x => x.ItemID === b.dataset.qrOpen); if (i) { qrSuccessFeedback(); showQRItemResult(i); } }
  if (b.dataset.qrStockCheck) { document.querySelectorAll('.qr-item-overlay').forEach(el => el.remove()); openQRStockCheck(b.dataset.qrStockCheck); return; }
  if (b.dataset.qrMove) {
    document.querySelectorAll('.qr-item-overlay').forEach(el => el.remove());
    const id = b.dataset.item; window.QR_SELECTED_ITEM = id;
    location.hash = b.dataset.qrMove === 'in' ? '#stockin' : '#stockout';
  }
});
