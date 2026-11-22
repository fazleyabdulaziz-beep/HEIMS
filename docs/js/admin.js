/* Phase 4: categories, settings (account, hotel, users), idle logout */
const ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER'];
const pw = (n, l) => fld(n, l, '', 'type=password required autocomplete=new-password minlength=8');

async function vCats() {
  await load(false); const W = can('ADMIN', 'SUPERVISOR');
  const rows = S.cats.map(c => { const it = S.items.filter(i => i.Category === c); return { c, n: it.length, q: it.reduce((s, i) => s + (Number(i.Quantity) || 0), 0), low: it.filter(i => i.st === 'LOW' || i.st === 'OUT').length }; });
  $('#view').innerHTML = (W ? '<div class="top"><button class="btn" id="addcat">+ Add Category</button></div>' : '') +
   `<div class="card" style="padding:4px"><table><thead><tr><th>Category</th><th class="n">Items</th><th class="n">Total qty</th><th class="n">Low / out</th><th></th></tr></thead><tbody>${rows.map(r => `<tr>
   <td data-l="Category"><b>${esc(r.c)}</b></td><td data-l="Items" class="n">${r.n}</td><td data-l="Total qty" class="n">${r.q}</td><td data-l="Low / out" class="n">${r.low ? `<span class="b warn">${r.low}</span>` : 0}</td>
   <td data-l="">${W ? `<button class="btn g sm" data-cat="${esc(r.c)}">Rename</button> ` : ''}<button class="btn g sm" data-catf="${esc(r.c)}">View items</button></td></tr>`).join('')}</tbody></table></div>`;
}

let USERS = [];
async function vSettings() {
  const u = JSON.parse(sessionStorage.user);
  let h = `<div class="card md0" style="margin-bottom:14px"><h3>My account</h3><p class="mut">${esc(u.name)} · ${esc(u.username)} · ${esc(u.role)}</p><button class="btn" id="pwbtn">Change password</button></div>`;
  if (u.role === 'ADMIN') {
    const [s, us] = await Promise.all([api('getSettings'), api('listUsers')]); USERS = us;
    h += `<div class="card md0" style="margin-bottom:14px"><h3>Hotel settings</h3>${fld('hn', 'Hotel / department name', s.HOTEL_NAME || '', 'maxlength=80')}${fld('rd', 'Days a new item counts as "recently added"', s.RECENT_DAYS || 7, 'type=number min=1 max=90')}<div class="mf"><button class="btn" id="savesett">Save settings</button></div></div>
    <div class="top"><button class="btn" id="adduser">+ Add User</button></div><div class="card" style="padding:4px"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${us.map(x => `<tr>
    <td data-l="Username">${esc(x.username)}</td><td data-l="Name">${esc(x.name)}</td><td data-l="Role">${esc(x.role)}</td><td data-l="Status"><span class="b ${x.active ? 'ok' : 'mut'}">${x.active ? 'Active' : 'Disabled'}</span></td>
    <td data-l=""><button class="btn g sm" data-uedit="${esc(x.username)}">Edit</button> <button class="btn g sm" data-ureset="${esc(x.username)}">Reset password</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  $('#view').innerHTML = h;
}
const statusSel = a => `<div><label>Status</label><select name="active"><option value="true" ${a ? 'selected' : ''}>Active</option><option value="false" ${a ? '' : 'selected'}>Disabled</option></select></div>`;

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset, done = async () => { await vSettings(); };
  if (b.id === 'addcat') modal('Add category', fld('name', 'Category name *', '', 'required'), 'Add', async x => { await api('addCategory', { ...x, rid: rid() }); toast('Category added'); await vCats(); });
  if (d.cat) modal('Rename category', fld('name', 'New name *', d.cat, 'required') + '<p class="mut">All items in this category are updated.</p>', 'Rename', async x => { await api('renameCategory', { from: d.cat, name: x.name, rid: rid() }); toast('Category renamed'); await vCats(); });
  if (d.catf) { S.f = { q: '', cat: d.catf, rack: '', st: '', brand: '', sort: 'name' }; location.hash = '#inventory'; }
  if (b.id === 'pwbtn') modal('Change password', pw('current', 'Current password *').replace(' minlength=8', '') + pw('next', 'New password * (min 8 characters)') + pw('again', 'Repeat new password *'), 'Change password', async x => {
    if (x.next !== x.again) throw new Error('New passwords do not match');
    await api('changePassword', { current: x.current, next: x.next, rid: rid() }); toast('Password changed'); });
  if (b.id === 'savesett') api('saveSettings', { HOTEL_NAME: $('[name=hn]').value, RECENT_DAYS: $('[name=rd]').value, rid: rid() }).then(() => { sessionStorage.hotel = $('[name=hn]').value; $('#hotel').textContent = sessionStorage.hotel; toast('Settings saved'); }).catch(x => toast(x.message, 'bad'));
  if (b.id === 'adduser') modal('Add user', `<div class="fg">${fld('username', 'Username *', '', 'required pattern="[A-Za-z0-9._\\-]{3,30}"')}${fld('name', 'Full name *', '', 'required')}${sel('role', 'Role *', ROLES, 'TECHNICIAN')}${pw('password', 'Temporary password *')}</div>`, 'Create user',
    async x => { await api('saveUser', { ...x, rid: rid() }); toast('User created'); await done(); });
  if (d.uedit) { const x = USERS.find(v => v.username === d.uedit);
    modal('Edit ' + esc(x.username), `<div class="fg">${fld('name', 'Full name *', x.name, 'required')}${sel('role', 'Role *', ROLES, x.role)}${statusSel(x.active)}</div>`, 'Save',
      async v => { await api('saveUser', { ...v, username: x.username, edit: true, rid: rid() }); toast('User updated'); await done(); }); }
  if (d.ureset) modal('Reset password: ' + esc(d.ureset), pw('password', 'New temporary password *') + '<p class="mut">Tell the user to change it after signing in.</p>', 'Reset',
    async v => { await api('resetPassword', { username: d.ureset, password: v.password, rid: rid() }); toast('Password reset'); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.ov:last-of-type')?.remove(); });

// sign out automatically after 30 minutes without activity
let _last = Date.now();
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => _last = Date.now(), { passive: true }));
setInterval(() => { if (sessionStorage.getItem('token') && !localStorage.rt && Date.now() - _last > 30 * 60 * 1000) logout(true); }, 60000);

/* ---------- Stock Verification Dashboard ---------- */
async function vStockVerification(force = false) {
  const d = await api('stockVerificationDashboard', force ? { refresh: true } : {}), c = d.counts;
  const status = r => ({ MATCHED: ['MATCHED','ok'], QTY_VARIANCE: ['Quantity variance','warn'], ITEM_MISMATCH: ['Item mismatch','bad'], SYSTEM_QTY_UNVERIFIED: ['System unverified','mut'] }[r] || [r || 'Unknown','mut']);
  $('#view').innerHTML = `<div class="top"><span class="mut sm">Latest physical check per active item is used for the summary.</span><button class="btn g" id="verify-refresh">Refresh</button></div>
    <div class="kpis verify-kpis">
      <div class="card kpi"><span class="mut">Active items</span><div class="v">${c.total}</div></div>
      <div class="card kpi"><span class="mut">Checked items</span><div class="v">${c.checked}</div></div>
      <div class="card kpi"><span class="mut">Matched</span><div class="v">${c.matched}</div></div>
      <div class="card kpi warn"><span class="mut">Quantity variance</span><div class="v">${c.quantityVariance}</div></div>
      <div class="card kpi" style="border-color:var(--bad)"><span class="mut">Item mismatch</span><div class="v">${c.itemMismatch}</div></div>
      <div class="card kpi"><span class="mut">Pending verification</span><div class="v">${c.pending}</div></div>
    </div>
    <div class="card verify-summary"><div class="verify-progress-head"><b>Verification progress</b><strong>${c.total ? Math.round(c.checked / c.total * 100) : 0}%</strong></div><div class="trk"><i style="width:${c.total ? c.checked / c.total * 100 : 0}%"></i></div><p class="mut sm">${c.systemUnverified} checked item(s) still have no system quantity baseline.</p></div>
    <div class="card verify-table"><h3>Latest stock checks</h3><div class="table-scroll"><table><thead><tr><th>Checked</th><th>Item</th><th class="n">System</th><th class="n">Physical</th><th class="n">Variance</th><th>Result</th><th>Checked by</th><th>Remarks</th></tr></thead><tbody>
      ${d.latestChecks.map(r => { const st = status(r.result); return `<tr><td data-l="Checked">${esc(fdt(r.timestamp))}</td><td data-l="Item"><b>${esc(r.itemName)}</b><br><small class="mut">${esc(r.itemId)}</small></td><td data-l="System" class="n">${r.systemQty === '' ? '-' : esc(r.systemQty)}</td><td data-l="Physical" class="n">${esc(r.countedQty)}</td><td data-l="Variance" class="n">${r.variance === '' ? '-' : (Number(r.variance) > 0 ? '+' : '') + esc(r.variance)}</td><td data-l="Result"><span class="b ${st[1]}">${st[0]}</span></td><td data-l="Checked by">${esc(r.checkedBy)}</td><td data-l="Remarks">${esc(r.notes || '-')}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No physical stock checks recorded yet.</td></tr>'}
    </tbody></table></div></div>`;
}

/* ---------- System Health Monitor ---------- */
async function vSystemHealth() {
  const started = performance.now();
  const d = await api('getSystemHealth');
  const latency = Math.round(performance.now() - started);
  const healthy = d.status === 'HEALTHY';
  $('#view').innerHTML = `<div class="top"><span class="mut sm">Live check of the HEIMS backend and required Google Sheets.</span><button class="btn" id="health-refresh">Run health check</button></div>
    <div class="card health-overview"><div><span class="mut sm">Overall system status</span><h2><span class="b ${healthy ? 'ok' : 'warn'}">${healthy ? 'HEALTHY' : 'ATTENTION REQUIRED'}</span></h2><p class="mut sm">Last checked: ${esc(fdt(d.checkedAt))}</p></div><div class="health-latency"><span class="mut sm">API round trip</span><strong>${latency} ms</strong><small class="mut">Browser to Apps Script and back</small></div></div>
    <div class="card health-meta"><div><span class="mut sm">Spreadsheet</span><b>${esc(d.spreadsheet)}</b></div><div><span class="mut sm">Apps Script cache</span><b class="${d.cache === 'OK' ? 'health-good' : 'health-bad'}">${esc(d.cache)}</b></div><div><span class="mut sm">Database sheets</span><b>${d.sheets.filter(x => x.status === 'OK').length} / ${d.sheets.length} available</b></div></div>
    <div class="card"><h3>Database connectivity</h3><div class="health-sheet-grid">${d.sheets.map(x => `<div class="health-sheet"><div><b>${esc(x.name)}</b><span class="b ${x.status === 'OK' ? 'ok' : 'bad'}">${x.status}</span></div><small class="mut">${x.records == null ? 'Sheet not found' : `${Number(x.records).toLocaleString()} records`}</small></div>`).join('')}</div></div>
    <p class="mut sm">This monitor checks Apps Script reachability, CacheService and required sheet availability. It does not measure Google service-wide uptime or guarantee every user permission.</p>`;
}
