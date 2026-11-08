/* Phase 4: categories, settings (account, hotel, users), idle logout */
const ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER'];
const pw = (n, l) => fld(n, l, '', 'type=password required autocomplete=new-password minlength=8');

async function vCats() {
  await load(true); const W = can('ADMIN', 'SUPERVISOR');
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
  if (d.catf) { S.f = { q: '', cat: d.catf, rack: '', st: '', brand: '' }; location.hash = '#inventory'; }
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