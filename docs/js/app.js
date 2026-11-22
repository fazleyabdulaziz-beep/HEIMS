const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ST = { IN: ['In Stock', 'ok'], LOW: ['Low Stock', 'warn'], OUT: ['Out of Stock', 'bad'], UNVERIFIED: ['Needs Count', 'mut'] };
const badge = s => `<span class="b ${ST[s][1]}">${ST[s][0]}</span>`;
const S = { items: [], cats: [], racks: [], loaded: false, f: { q: '', cat: '', rack: '', st: '', brand: '', sort: 'name' }, page: 1 };
const PER = 25;
const imgUrl = (u, w) => String(u || '').replace(/([?&]sz=)w\d+/, '$1w' + w);
const NOPIC = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>';
const thumb = i => i.ImageURL ? `<img class="th" loading="lazy" decoding="async" fetchpriority="low" alt="" src="${esc(imgUrl(i.ImageURL, 160))}">` : `<span class="th ph0">${NOPIC}</span>`;
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.replaceWith(Object.assign(document.createElement('span'), { className: e.target.className + ' ph0', innerHTML: NOPIC })); }, true);
function showItem(id) {
  const i = (S.showArch ? S.archived : S.items).find(x => x.ItemID === id); if (!i) return;
  const q = i.Quantity === '' ? 'Not counted yet' : i.Quantity + ' ' + i.Unit;
  const rows = [['Category', i.Category], ['Subcategory', i.Subcategory], ['Brand / model', [i.Brand, i.Model].filter(Boolean).join(' / ')], ['Rack', i.Rack], ['In stock', q], ['Minimum level', i.MinStock], ['Description', i.Description], ['Remarks', i.Remarks]].filter(r => r[1] !== '' && r[1] != null);
  const m = document.createElement('div'); m.className = 'ov';
  m.innerHTML = `<div class="card md det"><div class="hero">${i.ImageURL ? `<img alt="${esc(i.Name)}" decoding="async" src="${esc(imgUrl(i.ImageURL, 800))}">` : `<div class="noimg">${NOPIC}<span>No photo yet</span></div>`}</div>
   <div class="dh"><div><h3>${esc(i.Name)}</h3><span class="id">${esc(i.ItemID)}</span></div>${badge(i.st)}</div>
   <dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl><div class="mf"><button class="btn g" data-qr-label="${esc(i.ItemID)}">QR Label</button><button class="btn g" data-x>Close</button></div></div>`;
  document.body.append(m); m.onclick = e => { if (e.target === m || e.target.dataset.x !== undefined) m.remove(); };
}

function countUp() {
  document.querySelectorAll('.kpi .v').forEach(el => { const to = Number(el.textContent.replace(/,/g, '')); if (!isFinite(to) || !to) return; const t0 = performance.now();
    (function f(t) { const p = Math.min(1, (t - t0) / 800); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(f); })(t0); });
}
function moveInd() {
  const a = document.querySelector('.nav a.on'), i = $('#ind'); if (!a || !i || $('#app').hidden) return;
  i.style.width = a.offsetWidth + 'px'; i.style.transform = `translateX(${a.offsetLeft}px)`;
  a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
addEventListener('resize', moveInd);
function toast(m, t = '') { const d = document.createElement('div'); d.className = 'toast ' + t; d.textContent = m; $('#toasts').append(d); setTimeout(() => d.remove(), 3500); }
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); }
function logout(expired) {
  if (!expired) api('logout', { rt: localStorage.rt }).catch(() => {});
  localStorage.removeItem('rt');
  sessionStorage.clear(); if (typeof clearApiCache === 'function') clearApiCache(); S.loaded = false; $('#app').hidden = true; $('#login').hidden = false;
  $('#lu').value = localStorage.lu || ''; $('#lr').checked = !!localStorage.lu; $('#lp').value = '';
  if (expired) $('#le').textContent = 'Session expired. Please sign in again.';
}
function start() {
  const u = JSON.parse(sessionStorage.user); $('#who').textContent = `${u.name} · ${u.role}`;
  applyRoles(); $('#hotel').textContent = sessionStorage.hotel || ''; $('#login').hidden = true; $('#app').hidden = false; route();
}
async function load(force) {
  if (S.loaded && !force) return;
  const d = await api('inventory'); Object.assign(S, { items: d.items, cats: d.categories, racks: d.racks, loaded: true });
}

/* ---------- Minimal operational dashboard ---------- */
async function vDash() {
  const d = await api('dashboard'), k = d.kpi || {};
  const user = JSON.parse(sessionStorage.user || '{}');
  const manager = ['ADMIN', 'SUPERVISOR'].includes(user.role);
  const lowOut = Number(k.lowOut ?? ((Number(k.low) || 0) + (Number(k.out) || 0))) || 0;
  const pending = manager ? Number(k.pendingVerification || 0) : Number(k.unverified || 0);
  const pendingLabel = manager ? 'Pending Verification' : 'Needs Initial Count';
  const cards = [
    ['Active Items', Number(k.items) || 0, ''],
    ['Low / Out Stock', lowOut, lowOut ? 'bad' : ''],
    [pendingLabel, pending, pending ? 'warn' : ''],
    ['Pending Orders', Number(k.pendingOrders) || 0, k.pendingOrders ? 'warn' : '']
  ];
  const em = t => `<div class="empty dash-empty">${t}</div>`;
  const lowItems = Array.isArray(d.lowList) ? d.lowList : [];
  const action = (href, icon, label) => `<a class="dash-action" href="#${href}"><svg viewBox="0 0 24 24">${icon}</svg><span>${label}</span></a>`;
  const actions = [
    action('qrscanner', '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v2M20 20h-3M17 20v-1"/>', 'Scan QR'),
    action('inventory', '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>', 'View Inventory'),
    ...(can('ADMIN', 'SUPERVISOR', 'TECHNICIAN') ? [
      action('stockin', '<path d="M12 19V5M5 12l7-7 7 7"/>', 'Stock In'),
      action('stockout', '<path d="M12 5v14M19 12l-7 7-7-7"/>', 'Stock Out')
    ] : []),
    ...(manager ? [action('stockverification', '<path d="M4 4h16v16H4zM8 8h8M8 12h4M8 16h8M16 12l1.5 1.5L20 10"/>', 'Stock Verification')] : []),
    action('orders', '<path d="M3 5h18v14H3zM7 9h10M7 13h6M16 16l2 2 3-4"/>', 'Stock Orders')
  ];

  $('#view').innerHTML = `
    <div class="kpis dash-kpis">${cards.map(c => `<div class="card kpi ${c[2]}"><span class="mut">${c[0]}</span><div class="v">${c[1].toLocaleString()}</div></div>`).join('')}</div>
    <div class="dash-layout">
      <section class="card dash-panel">
        <div class="dash-panel-head"><div><h3>Needs Attention</h3><p class="mut">Items that may need action</p></div><a class="dash-text-link" href="#lowstock">View all</a></div>
        ${lowItems.length ? `<div class="dash-alert-list">${lowItems.map(i => `<div class="dash-alert-item"><div class="dash-alert-copy"><b>${esc(i.name)}</b><small class="mut">${esc(i.id)} · ${esc(i.rack)} · ${i.qty === '' ? 'Not counted' : `${esc(i.qty)} ${esc(i.unit || '')}`} · Min ${esc(i.min)}</small></div>${badge(i.st)}</div>`).join('')}</div>` : em('No low or out-of-stock items.')}
        ${!manager && Number(k.unverified || 0) > 0 ? `<p class="dash-note">${Number(k.unverified)} item(s) still need an initial quantity count by a supervisor.</p>` : ''}
        ${manager && Number(k.pendingVerification || 0) > 0 ? `<p class="dash-note">${Number(k.pendingVerification)} active item(s) have not been physically verified yet. <a href="#stockverification">Open Stock Verification</a></p>` : ''}
      </section>
      <section class="card dash-panel">
        <div class="dash-panel-head"><div><h3>Quick Actions</h3><p class="mut">Common inventory tasks</p></div></div>
        <div class="dash-action-grid">${actions.join('')}</div>
      </section>
    </div>`;
  countUp();
}

/* ---------- Inventory ---------- */
async function vInv() {
  S.showArch = false; await load(false);
  const o = (a, l) => `<option value="">${l}</option>` + a.map(x => `<option>${esc(x)}</option>`).join('');
  const brands = [...new Set(S.items.map(i => i.Brand).filter(Boolean))].sort();
  $('#view').innerHTML = `${can('ADMIN', 'SUPERVISOR') ? '<div class="top"><button class="btn g" id="arch">Show archived</button><button class="btn g" id="bulk-qr-open">Bulk QR Print</button><button class="btn" id="add">+ Add Item</button></div>' : ''}<div class="bar"><input id="f-q" placeholder="Search ID, name, brand or model…">
   <select id="f-cat">${o(S.cats, 'All categories')}</select><select id="f-rack">${o(S.racks, 'All racks')}</select>
   <select id="f-st"><option value="">All status</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
   <select id="f-brand">${o(brands, 'All brands')}</select><select id="f-sort"><option value="name">Sort: Name</option><option value="id">Sort: Item ID</option><option value="rack">Sort: Rack</option><option value="low">Sort: Low stock first</option></select><button class="btn g" id="clr">Clear all</button></div><div id="inv-count" class="inv-count mut sm"></div><div id="tbl"></div>`;
  Object.keys(S.f).forEach(k => $('#f-' + k).value = S.f[k]);
  drawTable();
}
function drawTable() {
  const f = S.f, q = f.q.toLowerCase(), A = can('ADMIN', 'SUPERVISOR');
  const rows = (S.showArch ? S.archived : S.items).filter(i => (!q || [i.ItemID, i.Name, i.Brand, i.Model, i.Subcategory].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!f.cat || i.Category === f.cat) && (!f.rack || i.Rack === f.rack) && (!f.st || i.st === f.st) && (!f.brand || i.Brand === f.brand));
  const rank = { OUT: 0, LOW: 1, UNVERIFIED: 2, IN: 3 };
  rows.sort((a, b) => f.sort === 'id' ? String(a.ItemID).localeCompare(String(b.ItemID)) : f.sort === 'rack' ? String(a.Rack).localeCompare(String(b.Rack)) || String(a.Name).localeCompare(String(b.Name)) : f.sort === 'low' ? rank[a.st] - rank[b.st] || String(a.Name).localeCompare(String(b.Name)) : String(a.Name).localeCompare(String(b.Name)));
  const pages = Math.max(1, Math.ceil(rows.length / PER)); S.page = Math.min(S.page, pages);
  const count = document.getElementById('inv-count'); if (count) count.textContent = `${rows.length} ${S.showArch ? 'archived' : 'active'} item(s) · ${S.items.length} active total · sort: ${f.sort || 'name'}`;
  const cur = rows.slice((S.page - 1) * PER, S.page * PER);
  $('#tbl').innerHTML = !rows.length ? '<div class="card empty">No items match your filters.</div>' :
    `<div class="card" style="padding:4px"><table><thead><tr><th>ID</th><th>Item</th><th>Category</th><th>Brand / Model</th><th>Rack</th><th class="n">Qty</th><th class="n">Min</th><th>Status</th><th>Actions</th></tr></thead><tbody>${cur.map(i => `<tr data-open="${esc(i.ItemID)}">
    <td data-l="ID" class="id">${esc(i.ItemID)}</td><td data-l="Item" class="nm">${thumb(i)}<b>${esc(i.Name)}</b></td><td data-l="Category">${esc(i.Category)}</td>
    <td data-l="Brand / Model">${esc([i.Brand, i.Model].filter(Boolean).join(' / ') || '-')}</td><td data-l="Rack">${esc(i.Rack)}</td>
    <td data-l="Qty" class="n">${i.Quantity === '' ? '?' : esc(i.Quantity) + ' ' + esc(i.Unit)}</td><td data-l="Min" class="n">${esc(i.MinStock)}</td><td data-l="Status">${badge(i.st)}</td><td data-l="Actions"><button class="btn g sm" data-qr-label="${esc(i.ItemID)}">QR Label</button> ${A ? (S.showArch ? `<button class="btn g sm" data-restore="${esc(i.ItemID)}">Restore</button>` : `<button class="btn g sm" data-edit="${esc(i.ItemID)}">Edit</button> <button class="btn g sm" data-arch="${esc(i.ItemID)}">Archive</button>`) : ''}</td></tr>`).join('')}</tbody></table></div>
    <div class="pg"><span class="mut">${rows.length} item(s) · page ${S.page}/${pages}</span><div><button class="btn g" data-p="-1" ${S.page < 2 ? 'disabled' : ''}>Prev</button><button class="btn g" data-p="1" ${S.page >= pages ? 'disabled' : ''}>Next</button></div></div>`;
}

/* ---------- Router & events ---------- */
const V = { dashboard: ['Dashboard', vDash], inventory: ['Inventory', vInv], qrscanner: ['QR Scanner', vQR], stockin: ['Stock In', () => vMove('in')], stockout: ['Stock Out', () => vMove('out')], adjust: ['Stock Adjustment', () => vMove('adj')], lowstock: ['Low Stock Alerts', vLow], history: ['Transaction History', vHist], audit: ['Audit Log', vAudit], racks: ['Rack Locations', vRacks], categories: ['Categories', vCats], settings: ['Settings', vSettings], orders: ['Stock Orders', vOrders], stockverification: ['Stock Verification', vStockVerification] };
async function route() {
  if (typeof stopQRScanner === 'function') await stopQRScanner();
  let k = (location.hash || '#dashboard').slice(1); if (!V[k]) k = 'dashboard';
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.hash === '#' + k));
  moveInd(); $('#title').textContent = V[k][0]; $('#side').classList.remove('open');
  $('#view').innerHTML = '<div class="load"><i></i>Loading…</div>';
  try { await V[k][1](); } catch (e) { $('#view').innerHTML = `<div class="card empty">${esc(e.message)}<br><br><button class="btn" id="retry">Retry</button></div>`; }
}


// Console-only diagnostics: manual execution only; no polling or background requests.
// Run HEIMS_DIAG.run() in DevTools Console while signed in.
window.HEIMS_DIAG = Object.freeze({
  async ping() {
    const t0 = performance.now();
    try {
      await request('dashboard', {}); // bypass app cache to measure a real API round-trip
      const result = { ok: true, action: 'dashboard', ms: Math.round(performance.now() - t0), cache: 'bypassed' };
      console.info('[HEIMS] Backend round-trip:', result);
      return result;
    } catch (error) {
      const result = { ok: false, action: 'dashboard', ms: Math.round(performance.now() - t0), error: error.message };
      console.error('[HEIMS] Backend request failed:', result);
      return result;
    }
  },
  async inventory() {
    const t0 = performance.now();
    try {
      const data = await request('inventory', {}); // bypass app cache; do not log item records
      const result = { ok: true, action: 'inventory', ms: Math.round(performance.now() - t0), itemCount: Array.isArray(data.items) ? data.items.length : 0, cache: 'bypassed' };
      console.info('[HEIMS] Inventory request:', result);
      return result;
    } catch (error) {
      const result = { ok: false, action: 'inventory', ms: Math.round(performance.now() - t0), error: error.message };
      console.error('[HEIMS] Inventory request failed:', result);
      return result;
    }
  },
  async run() {
    console.info('[HEIMS] Manual diagnostics only. No background checks will run.');
    const results = [await this.ping(), await this.inventory()];
    console.table(results.map(({ ok, action, ms, itemCount, error }) => ({ ok, action, ms, itemCount: itemCount ?? '', error: error ?? '' })));
    return results;
  }
});

document.addEventListener('click', e => {
  const row = e.target.closest('tr[data-open]'); if (row && !e.target.closest('button,a,input')) return showItem(row.dataset.open);
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'eye') { const p = $('#lp'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; t.classList.toggle('on', s); t.setAttribute('aria-pressed', s); t.setAttribute('aria-label', s ? 'Hide password' : 'Show password'); }
  if (t.id === 'retry') route();
  if (t.id === 'verify-refresh') vStockVerification(true).catch(e => toast(e.message, 'bad'));
  if (t.id === 'clr') { S.f = { q: '', cat: '', rack: '', st: '', brand: '', sort: 'name' }; S.page = 1; Object.keys(S.f).forEach(k => $('#f-' + k).value = ''); drawTable(); }
  if (t.dataset.p) { S.page += +t.dataset.p; drawTable(); }
});
document.addEventListener('input', e => {
  if (e.target.id?.startsWith('f-') && e.target.id !== 'f-sort') { S.f[e.target.id.slice(2)] = e.target.value; S.page = 1; drawTable(); }
});
document.addEventListener('change', e => {
  if (e.target.id?.startsWith('f-')) { S.f[e.target.id.slice(2)] = e.target.value; S.page = 1; drawTable(); }
});
$('#lf').onsubmit = async e => {
  e.preventDefault(); const b = $('#lb'), rem = $('#lr').checked; b.disabled = true; b.textContent = 'Signing in…'; $('#le').textContent = '';
  try {
    const un = $('#lu').value.trim(), r = await api('login', { username: un, password: $('#lp').value, remember: true });
    saveSession(r); $('#lp').value = '';
    if (r.rt) { localStorage.rt = r.rt; localStorage.lu = un; }
    start();
  } catch (err) { $('#le').textContent = err.message; }
  b.disabled = false; b.textContent = 'Sign in';
};
const on = (s, f) => { const e = $(s); if (e) e.onclick = f; };
on('#out', () => logout(false));
on('#lt', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
on('#theme', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
window.addEventListener('hashchange', () => sessionStorage.token && route());
setTheme(localStorage.theme || 'dark');
(async function boot() {
  if (localStorage.lu) { $('#lu').value = localStorage.lu; $('#lr').checked = true; }
  if (sessionStorage.token && sessionStorage.user) return start();
  if (localStorage.rt) { try { await resumeSession(); return start(); } catch (e) {} }
  $('#login').hidden = false;
})();
