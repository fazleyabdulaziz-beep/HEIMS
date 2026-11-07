/* Phase 3: transaction history, audit log, low stock alerts, rack locations */
function csv(name, head, rows) {
  const q = v => '"' + String(v ?? '').replace(/^([=+@]|-(?!\d))/, "'$1").replace(/"/g, '""') + '"';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
  a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(a.href);
}
const ld = s => new Date(s).toLocaleDateString('en-CA'), fdt = s => new Date(s).toLocaleString();
const pager = (n, p, per, attr) => { const pg = Math.max(1, Math.ceil(n / per)); return `<div class="pg"><span class="mut">${n} record(s) · page ${Math.min(p, pg)}/${pg}</span><div><button class="btn g" ${attr}="-1" ${p < 2 ? 'disabled' : ''}>Prev</button><button class="btn g" ${attr}="1" ${p >= pg ? 'disabled' : ''}>Next</button></div></div>`; };

/* ---------- Transaction history ---------- */
const H = { rows: [], f: { q: '', from: '', to: '', type: '', staff: '', item: '' }, page: 1 };
const TB = { STOCK_IN: 'ok', STOCK_OUT: 'warn', ADJUSTMENT: 'warn', ITEM_ARCHIVED: 'bad' };
const HCOLS = ['Timestamp', 'TxnID', 'ItemID', 'ItemName', 'Type', 'PrevQty', 'Change', 'NewQty', 'Staff', 'Department', 'Reference', 'Supplier', 'Remarks', 'User'];
async function vHist() {
  H.rows = await api('history'); H.page = 1;
  const o = (a, l) => `<option value="">${l}</option>` + [...new Set(a.filter(Boolean))].sort().map(x => `<option>${esc(x)}</option>`).join('');
  $('#view').innerHTML = `<div class="bar hb"><input id="h-q" placeholder="Search ID, item, staff, remarks…"><input id="h-from" type="date" title="From date"><input id="h-to" type="date" title="To date">
   <select id="h-type">${o(H.rows.map(r => r.Type), 'All types')}</select><select id="h-staff">${o(H.rows.map(r => r.Staff), 'All staff')}</select><input id="h-item" placeholder="Item ID / name"></div>
   <div class="top"><button class="btn g" id="h-clr">Clear all</button>${can('ADMIN', 'SUPERVISOR') ? '<button class="btn g" id="h-aud">Audit log</button>' : ''}<button class="btn" id="h-csv">Export CSV</button></div><div id="htbl"></div>`;
  Object.keys(H.f).forEach(k => $('#h-' + k).value = H.f[k]); drawHist();
}
function hRows() {
  const f = H.f, q = f.q.toLowerCase(), it = f.item.toLowerCase();
  return H.rows.filter(r => (!q || Object.values(r).join(' ').toLowerCase().includes(q)) && (!f.type || r.Type === f.type) && (!f.staff || r.Staff === f.staff) &&
    (!it || (r.ItemID + ' ' + r.ItemName).toLowerCase().includes(it)) && (!f.from || ld(r.Timestamp) >= f.from) && (!f.to || ld(r.Timestamp) <= f.to));
}
function drawHist() {
  const rows = hRows(), cur = rows.slice((H.page - 1) * 25, H.page * 25), n = v => v === '' ? '-' : esc(v);
  $('#htbl').innerHTML = !rows.length ? '<div class="card empty">No transactions match your filters.</div>' :
    `<div class="card" style="padding:4px"><table><thead><tr><th>Time</th><th>Txn</th><th>Item</th><th>Type</th><th class="n">Prev</th><th class="n">Change</th><th class="n">New</th><th>Staff</th><th>Details</th></tr></thead><tbody>${cur.map(r => `<tr>
    <td data-l="Time">${esc(fdt(r.Timestamp))}</td><td data-l="Txn">${esc(r.TxnID)}</td><td data-l="Item"><b>${esc(r.ItemName)}</b><br><small class="mut">${esc(r.ItemID)}</small></td>
    <td data-l="Type"><span class="b ${TB[r.Type] || 'mut'}">${esc(r.Type.replace('_', ' '))}</span></td><td data-l="Prev" class="n">${n(r.PrevQty)}</td>
    <td data-l="Change" class="n">${r.Change > 0 ? '+' : ''}${esc(r.Change)}</td><td data-l="New" class="n">${n(r.NewQty)}</td><td data-l="Staff">${esc(r.Staff)}</td>
    <td data-l="Details">${esc([r.Department, r.Reference, r.Supplier, r.Remarks].filter(Boolean).join(' · ')) || '-'}</td></tr>`).join('')}</tbody></table></div>${pager(rows.length, H.page, 25, 'data-hp')}`;
}
async function vAudit() {
  const rows = await api('auditLog'), s = v => esc(String(v).slice(0, 90));
  $('#view').innerHTML = `<div class="top"><button class="btn g" id="a-back">Back to history</button></div><div class="card" style="padding:4px"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Before</th><th>After</th></tr></thead><tbody>${rows.map(r => `<tr>
   <td data-l="Time">${esc(fdt(r.Timestamp))}</td><td data-l="User">${esc(r.User)}</td><td data-l="Action">${esc(r.Action)}</td><td data-l="Entity">${esc(r.EntityID)}</td><td data-l="Before"><small>${s(r.Before)}</small></td><td data-l="After"><small>${s(r.After)}</small></td></tr>`).join('') || '<tr><td>No entries</td></tr>'}</tbody></table></div>`;
}

/* ---------- Low stock ---------- */
let LOW = [];
async function vLow() {
  await load(true);
  LOW = S.items.filter(i => i.st === 'LOW' || i.st === 'OUT').sort((a, b) => (b.MinStock - b.Quantity) - (a.MinStock - a.Quantity));
  const nomin = S.items.filter(i => !Number(i.MinStock)).length;
  $('#view').innerHTML = `<div class="top"><button class="btn" id="l-csv" ${LOW.length ? '' : 'disabled'}>Export CSV</button></div>` + (!LOW.length ? '<div class="card empty">All counted items are above their minimum level.</div>' :
    `<div class="card" style="padding:4px"><table><thead><tr><th>ID</th><th>Item</th><th>Rack</th><th class="n">Qty</th><th class="n">Min</th><th class="n">Shortfall</th><th>Status</th></tr></thead><tbody>${LOW.map(i => `<tr>
    <td data-l="ID">${esc(i.ItemID)}</td><td data-l="Item"><b>${esc(i.Name)}</b></td><td data-l="Rack">${esc(i.Rack)}</td><td data-l="Qty" class="n">${esc(i.Quantity)} ${esc(i.Unit)}</td>
    <td data-l="Min" class="n">${esc(i.MinStock)}</td><td data-l="Shortfall" class="n">${Math.max(0, i.MinStock - i.Quantity)}</td><td data-l="Status">${badge(i.st)}</td></tr>`).join('')}</tbody></table></div>`) +
    `<p class="mut">${nomin} item(s) have no minimum stock level, so they never raise an alert. Set it in Inventory → Edit.</p>`;
}

/* ---------- Rack locations ---------- */
async function vRacks() { await load(true); drawRacks(); }
function drawRacks() {
  const W = can('ADMIN', 'SUPERVISOR');
  const R = S.racks.map(r => { const it = S.items.filter(i => i.Rack === r); return { r, n: it.length, q: it.reduce((s, i) => s + (Number(i.Quantity) || 0), 0), low: it.filter(i => i.st === 'LOW' || i.st === 'OUT').length }; });
  const items = S.items.filter(i => i.Rack === S.rack);
  $('#view').innerHTML = (W ? '<div class="top"><button class="btn" id="addloc">+ Add Location</button></div>' : '') +
   `<div class="rk">${R.map(x => `<button class="card rkc ${S.rack === x.r ? 'on' : ''}" data-rack="${esc(x.r)}"><b>${esc(x.r)}</b><span class="mut">${x.n} items · ${x.q} qty</span>${x.low ? `<span class="b warn">${x.low} low / out</span>` : ''}</button>`).join('')}</div>` +
   (!S.rack ? '<div class="card empty">Select a rack to view its items.</div>' : !items.length ? `<div class="card empty">${esc(S.rack)} is empty.</div>` :
   `<div class="card" style="padding:4px"><table><thead><tr>${W ? '<th></th>' : ''}<th>ID</th><th>Item</th><th class="n">Qty</th><th>Status</th></tr></thead><tbody>${items.map(i => `<tr>${W ? `<td data-l=""><input type="checkbox" class="rk-chk" value="${esc(i.ItemID)}"></td>` : ''}
    <td data-l="ID">${esc(i.ItemID)}</td><td data-l="Item"><b>${esc(i.Name)}</b></td><td data-l="Qty" class="n">${i.Quantity === '' ? '?' : esc(i.Quantity) + ' ' + esc(i.Unit)}</td><td data-l="Status">${badge(i.st)}</td></tr>`).join('')}</tbody></table></div>` +
   (W ? `<div class="top" style="margin-top:12px;align-items:center"><span class="mut">Move selected to</span><select id="rk-to" style="width:auto">${S.racks.filter(r => r !== S.rack).map(r => `<option>${esc(r)}</option>`).join('')}</select><button class="btn" id="rk-move">Move selected</button></div>` : ''));
}

document.addEventListener('input', e => { const id = e.target.id; if (id && id.startsWith('h-') && id.slice(2) in H.f) { H.f[id.slice(2)] = e.target.value; H.page = 1; drawHist(); } });
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'h-csv') csv('transactions', HCOLS, hRows().map(r => HCOLS.map(k => r[k])));
  if (b.id === 'h-clr') { H.f = { q: '', from: '', to: '', type: '', staff: '', item: '' }; H.page = 1; Object.keys(H.f).forEach(k => $('#h-' + k).value = ''); drawHist(); }
  if (b.id === 'h-aud') location.hash = '#audit';
  if (b.id === 'a-back') location.hash = '#history';
  if (b.dataset.hp) { H.page += +b.dataset.hp; drawHist(); }
  if (b.id === 'l-csv') csv('low-stock', ['ItemID', 'Item', 'Rack', 'Qty', 'Unit', 'Min', 'Shortfall', 'Status'], LOW.map(i => [i.ItemID, i.Name, i.Rack, i.Quantity, i.Unit, i.MinStock, Math.max(0, i.MinStock - i.Quantity), ST[i.st][0]]));
  if (b.dataset.rack) { S.rack = b.dataset.rack; drawRacks(); }
  if (b.id === 'addloc') modal('Add location', fld('name', 'Location name *', '', 'required placeholder="Rack 4,1"') + fld('description', 'Description'), 'Add location',
    async d => { await api('addLocation', { ...d, rid: rid() }); toast('Location added'); await vRacks(); });
  if (b.id === 'rk-move') {
    const ids = [...document.querySelectorAll('.rk-chk:checked')].map(c => c.value);
    if (!ids.length) return toast('Select items first', 'bad');
    b.disabled = true;
    api('transferItems', { itemIds: ids, toRack: $('#rk-to').value, rid: rid() }).then(async r => { toast(r.moved + ' item(s) moved'); await load(true); drawRacks(); }).catch(x => { toast(x.message, 'bad'); b.disabled = false; });
  }
});