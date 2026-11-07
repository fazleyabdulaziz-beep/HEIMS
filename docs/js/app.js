const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ST = { IN: ['In Stock', 'ok'], LOW: ['Low Stock', 'warn'], OUT: ['Out of Stock', 'bad'], UNVERIFIED: ['Needs Count', 'mut'] };
const badge = s => `<span class="b ${ST[s][1]}">${ST[s][0]}</span>`;
const S = { items: [], cats: [], racks: [], loaded: false, f: { q: '', cat: '', rack: '', st: '', brand: '' }, page: 1 };
const PER = 25;

function toast(m, t = '') { const d = document.createElement('div'); d.className = 'toast ' + t; d.textContent = m; $('#toasts').append(d); setTimeout(() => d.remove(), 3500); }
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); }
function logout(expired) {
  if (!expired) api('logout').catch(() => {});
  sessionStorage.clear(); S.loaded = false; $('#app').hidden = true; $('#login').hidden = false;
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

/* ---------- Dashboard ---------- */
async function vDash() {
  const d = await api('dashboard'), k = d.kpi, a = d.availability, tot = Math.max(1, k.items);
  const cards = [['Total Items', k.items], ['Total Quantity', k.qty], ['Categories', k.categories], ['Low Stock', k.low, 'warn'], ['Out of Stock', k.out, 'bad'], ['Recently Added', k.recent]];
  const max = Math.max(1, ...Object.values(d.byCat)), em = t => `<div class="empty">${t}</div>`;
  const seg = [['IN', 'ok'], ['LOW', 'warn'], ['OUT', 'bad'], ['UNVERIFIED', 'mut']];
  $('#view').innerHTML = `<div class="kpis">${cards.map(c => `<div class="card kpi ${c[2] || ''}"><span class="mut">${c[0]}</span><div class="v">${c[1].toLocaleString()}</div></div>`).join('')}</div>
  <div class="grid">
   <div class="card"><h3>Stock Distribution by Category</h3>${Object.entries(d.byCat).sort((x, y) => y[1] - x[1]).map(([n, v]) => `<div class="row"><span>${esc(n)}</span><div class="trk"><i style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join('') || em('No data')}</div>
   <div class="card"><h3>Stock Availability Overview</h3><div class="trk stack">${seg.map(([s, c]) => `<i class="${c}-bg" style="width:${a[s] / tot * 100}%"></i>`).join('')}</div>
    <div class="leg">${seg.map(([s]) => `<span>${ST[s][0]}: <b>${a[s]}</b></span>`).join('')}</div>
    ${k.unverified ? `<p class="mut">${k.unverified} item(s) have no recorded quantity and need a physical count.</p>` : ''}</div>
   <div class="card"><h3>Low Stock Summary</h3>${d.lowList.map(i => `<div class="li"><span>${esc(i.name)}<br><small class="mut">${esc(i.id)} · ${esc(i.rack)}</small></span>${badge(i.st)}</div>`).join('') || em('No low or out-of-stock items. Set minimum stock levels to enable alerts.')}</div>
   <div class="card"><h3>Recent Inventory Activities</h3>${d.activity.map(r => `<div class="li"><span>${esc(r.Action)} <small class="mut">${esc(r.EntityID || r.After)}</small></span><small class="mut">${new Date(r.Timestamp).toLocaleString()}</small></div>`).join('') || em('No activity yet')}</div>
   <div class="card"><h3>Top 10 Most Used Items</h3>${d.top.map(([n, v]) => `<div class="li"><span>${esc(n)}</span><b>${v}</b></div>`).join('') || em('No stock-out transactions yet')}</div></div>`;
}

/* ---------- Inventory ---------- */
async function vInv() {
  S.showArch = false; await load(true);
  const o = (a, l) => `<option value="">${l}</option>` + a.map(x => `<option>${esc(x)}</option>`).join('');
  const brands = [...new Set(S.items.map(i => i.Brand).filter(Boolean))].sort();
  $('#view').innerHTML = `${can('ADMIN', 'SUPERVISOR') ? '<div class="top"><button class="btn g" id="arch">Show archived</button><button class="btn" id="add">+ Add Item</button></div>' : ''}<div class="bar"><input id="f-q" placeholder="Search Item ID or item name…">
   <select id="f-cat">${o(S.cats, 'All categories')}</select><select id="f-rack">${o(S.racks, 'All racks')}</select>
   <select id="f-st"><option value="">All status</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
   <select id="f-brand">${o(brands, 'All brands')}</select><button class="btn g" id="clr">Clear all</button></div><div id="tbl"></div>`;
  Object.keys(S.f).forEach(k => $('#f-' + k).value = S.f[k]);
  drawTable();
}
function drawTable() {
  const f = S.f, q = f.q.toLowerCase(), A = can('ADMIN', 'SUPERVISOR');
  const rows = (S.showArch ? S.archived : S.items).filter(i => (!q || i.ItemID.toLowerCase().includes(q) || i.Name.toLowerCase().includes(q)) &&
    (!f.cat || i.Category === f.cat) && (!f.rack || i.Rack === f.rack) && (!f.st || i.st === f.st) && (!f.brand || i.Brand === f.brand));
  const pages = Math.max(1, Math.ceil(rows.length / PER)); S.page = Math.min(S.page, pages);
  const cur = rows.slice((S.page - 1) * PER, S.page * PER);
  $('#tbl').innerHTML = !rows.length ? '<div class="card empty">No items match your filters.</div>' :
    `<div class="card" style="padding:4px"><table><thead><tr><th>ID</th><th>Item</th><th>Category</th><th>Brand / Model</th><th>Rack</th><th class="n">Qty</th><th class="n">Min</th><th>Status</th>${A ? '<th></th>' : ''}</tr></thead><tbody>${cur.map(i => `<tr>
    <td data-l="ID">${esc(i.ItemID)}</td><td data-l="Item"><b>${esc(i.Name)}</b></td><td data-l="Category">${esc(i.Category)}</td>
    <td data-l="Brand / Model">${esc([i.Brand, i.Model].filter(Boolean).join(' / ') || '-')}</td><td data-l="Rack">${esc(i.Rack)}</td>
    <td data-l="Qty" class="n">${i.Quantity === '' ? '?' : esc(i.Quantity) + ' ' + esc(i.Unit)}</td><td data-l="Min" class="n">${esc(i.MinStock)}</td><td data-l="Status">${badge(i.st)}</td>${A ? `<td data-l="">${S.showArch ? `<button class="btn g sm" data-restore="${esc(i.ItemID)}">Restore</button>` : `<button class="btn g sm" data-edit="${esc(i.ItemID)}">Edit</button> <button class="btn g sm" data-arch="${esc(i.ItemID)}">Archive</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>
    <div class="pg"><span class="mut">${rows.length} item(s) · page ${S.page}/${pages}</span><div><button class="btn g" data-p="-1" ${S.page < 2 ? 'disabled' : ''}>Prev</button><button class="btn g" data-p="1" ${S.page >= pages ? 'disabled' : ''}>Next</button></div></div>`;
}

/* ---------- Router & events ---------- */
const V = { dashboard: ['Dashboard', vDash], inventory: ['Inventory', vInv], stockin: ['Stock In', () => vMove('in')], stockout: ['Stock Out', () => vMove('out')], adjust: ['Stock Adjustment', () => vMove('adj')], lowstock: ['Low Stock Alerts', vLow], history: ['Transaction History', vHist], audit: ['Audit Log', vAudit], racks: ['Rack Locations', vRacks], categories: ['Categories', vCats], settings: ['Settings', vSettings] };
async function route() {
  let k = (location.hash || '#dashboard').slice(1); if (!V[k]) k = 'dashboard';
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.hash === '#' + k));
  $('#title').textContent = V[k][0]; $('#side').classList.remove('open');
  $('#view').innerHTML = '<div class="load"><i></i>Loading…</div>';
  try { await V[k][1](); } catch (e) { $('#view').innerHTML = `<div class="card empty">${esc(e.message)}<br><br><button class="btn" id="retry">Retry</button></div>`; }
}
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'retry') route();
  if (t.id === 'clr') { S.f = { q: '', cat: '', rack: '', st: '', brand: '' }; S.page = 1; Object.keys(S.f).forEach(k => $('#f-' + k).value = ''); drawTable(); }
  if (t.dataset.p) { S.page += +t.dataset.p; drawTable(); }
});
document.addEventListener('input', e => {
  if (e.target.id?.startsWith('f-')) { S.f[e.target.id.slice(2)] = e.target.value; S.page = 1; drawTable(); }
});
$('#lf').onsubmit = async e => {
  e.preventDefault(); const b = $('#lb'); b.disabled = true; b.textContent = 'Signing in…'; $('#le').textContent = '';
  try {
    const r = await api('login', { username: $('#lu').value, password: $('#lp').value });
    sessionStorage.token = r.token; sessionStorage.user = JSON.stringify(r.user); sessionStorage.hotel = r.hotel || ''; $('#lp').value = ''; start();
  } catch (err) { $('#le').textContent = err.message; }
  b.disabled = false; b.textContent = 'Sign in';
};
$('#out').onclick = () => logout(false);
$('#menu').onclick = () => $('#side').classList.toggle('open');
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
window.addEventListener('hashchange', () => sessionStorage.token && route());
setTheme(localStorage.theme || 'dark');
sessionStorage.token && sessionStorage.user ? start() : ($('#login').hidden = false);