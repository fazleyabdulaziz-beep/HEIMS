/* HEIMS QR Scanner + QR label printing. Camera scanning uses html5-qrcode (ZXing) for Android/iOS Safari support. */
let heimsQRScanner = null;
let heimsQRRunning = false;
let heimsQRLastValue = '';
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
  if (heimsQRRunning) await stopQRScanner();
  const item = S.items.find(i => String(i.ItemID).toLowerCase() === itemId.toLowerCase());
  if (!item) {
    $('#qr-item-result').innerHTML = `<div class="card empty">No active inventory item matches <b>${esc(itemId)}</b>. Check the label or search manually.</div>`;
    $('#qr-camera-status').textContent = 'QR read complete. Item not found in active inventory.';
    return;
  }
  heimsQRLastValue = item.ItemID;
  showQRItemResult(item);
  $('#qr-camera-status').textContent = `Found ${item.ItemID} — ${item.Name}`;
}

function showQRItemResult(i) {
  const quantity = i.Quantity === '' ? 'Not counted' : `${esc(i.Quantity)} ${esc(i.Unit)}`;
  $('#qr-item-result').innerHTML = `<div class="card qr-found"><div class="qr-found-main"><div><span class="b ok">ITEM FOUND</span><h3>${esc(i.Name)}</h3><span class="id">${esc(i.ItemID)}</span></div>${badge(i.st)}</div>
    <div class="qr-details"><span><small class="mut">Current quantity</small><b>${quantity}</b></span><span><small class="mut">Rack / location</small><b>${esc(i.Rack || '-')}</b></span><span><small class="mut">Category</small><b>${esc(i.Category || '-')}</b></span><span><small class="mut">Minimum stock</small><b>${esc(i.MinStock ?? 0)} ${esc(i.Unit || '')}</b></span></div>
    <div class="qr-actions"><button class="btn" data-qr-move="in" data-item="${esc(i.ItemID)}">Stock In</button><button class="btn" data-qr-move="out" data-item="${esc(i.ItemID)}">Stock Out</button><button class="btn g" data-qr-label="${esc(i.ItemID)}">Print QR Label</button></div></div>`;
}

function drawQRSearch() {
  const q = $('#qr-search').value.trim().toLowerCase(), target = $('#qr-search-results');
  if (!q) { target.innerHTML = '<span class="mut sm">Type an item ID or name.</span>'; return; }
  const found = S.items.filter(i => String(i.ItemID).toLowerCase().includes(q) || String(i.Name).toLowerCase().includes(q)).slice(0, 8);
  target.innerHTML = found.length ? found.map(i => `<button class="qr-search-hit" data-qr-open="${esc(i.ItemID)}"><span><b>${esc(i.Name)}</b><small class="mut">${esc(i.ItemID)} · ${esc(i.Rack)}</small></span>${badge(i.st)}</button>`).join('') : '<span class="mut sm">No matching items.</span>';
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
  if (b.dataset.qrOpen) { const i = S.items.find(x => x.ItemID === b.dataset.qrOpen); if (i) showQRItemResult(i); }
  if (b.dataset.qrMove) {
    const id = b.dataset.item; window.QR_SELECTED_ITEM = id;
    location.hash = b.dataset.qrMove === 'in' ? '#stockin' : '#stockout';
  }
});
