/* HEIMS forms: item add/edit/archive and shared modal helpers */
const can = (...r) => r.includes((JSON.parse(sessionStorage.user || '{}')).role);
const rid = () => crypto.randomUUID();
function applyRoles() { document.querySelectorAll('[data-roles]').forEach(a => a.hidden = !can(...a.dataset.roles.split(','))); }

function modal(title, body, okText, onOk, extraClass = '', onStart = null) {
  const m = document.createElement('div'); m.className = 'ov' + (extraClass ? ' ' + extraClass : '');
  m.innerHTML = `<form class="card md"><h3>${title}</h3>${body}<div class="err"></div><div class="mf"><button type="button" class="btn g" data-x>Cancel</button><button class="btn">${okText}</button></div></form>`;
  document.body.append(m);
  const f = m.firstChild, b = f.querySelector('.mf .btn:last-child'), er = f.querySelector('.err');
  f.querySelector('input,select')?.focus();
  m.onclick = e => { if (e.target === m || e.target.dataset.x !== undefined) m.remove(); };
  f.onsubmit = async e => {
    e.preventDefault(); b.disabled = true; er.textContent = '';
    const values = Object.fromEntries(new FormData(f));
    // Fast-path forms can close immediately and start work on the next frame,
    // allowing the browser to paint a pending state before any network request.
    if (typeof onStart === 'function') {
      try { onStart(values); m.remove(); }
      catch (x) { er.textContent = x.message; b.disabled = false; }
      return;
    }
    try { await onOk(values); m.remove(); } catch (x) { er.textContent = x.message; b.disabled = false; }
  };
}
/* ---------- Standard loading / background-save helpers (used by EVERY action) ---------- */
const isOn = h => location.hash.replace('#', '') === h;
const loadingHTML = (t = 'Loading…') => `<div class="load"><i></i>${t}</div>`;
// bg(): shows one consistent pending toast, runs the task in the background (UI stays usable),
// then turns the same toast into a success / failure message. Never blocks the screen.
//   o.ok    text or fn(result)  - success message
//   o.fail  text                - failure prefix
//   o.after fn(result)          - silent refresh after success (redraw table, reload list...)
//   o.onError fn(err)           - re-enable buttons etc.
function bg(label, task, o = {}) {
  const t = toast(label, 'pending', 0);
  const finish = (cls, msg, ms) => { t.className = 'toast ' + cls; t.textContent = msg; setTimeout(() => t.remove(), ms); };
  return new Promise(resolve => requestAnimationFrame(() => {   // let the pending toast paint first
    Promise.resolve().then(task).then(r => {
      finish('', typeof o.ok === 'function' ? o.ok(r) : (o.ok || 'Saved'), 3500);
      Promise.resolve(o.after && o.after(r)).catch(() => {}).finally(() => resolve(r));
    }).catch(err => {
      finish('bad', (o.fail || 'Failed') + ': ' + ((err && err.message) || 'Please try again.'), 6000);
      try { o.onError && o.onError(err); } catch (_) {}
      resolve(undefined);
    });
  }));
}
// modalBg(): form closes instantly, save continues in the background.
// o.validate(values) may throw -> error shows inside the form and it stays open.
function modalBg(title, body, okText, label, run, o = {}) {
  modal(title, body, okText, async () => {}, o.cls || '', values => { if (o.validate) o.validate(values); bg(label, () => run(values), o); });
}
const fld = (n, l, v = '', x = '') => `<div><label>${l}</label><input name="${n}" value="${esc(v)}" ${x}></div>`;
const sel = (n, l, a, v) => `<div><label>${l}</label><select name="${n}" required>${a.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;

const PIC = { data: null };
function shrink(file, max = 900) {
  return new Promise((ok, no) => { const r = new FileReader(); r.onerror = () => no(new Error('Could not read this file'));
    r.onload = () => { const im = new Image(); im.onerror = () => no(new Error('This image type is not supported'));
      im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .76)); }; im.src = r.result; }; r.readAsDataURL(file); });
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'ph' || !e.target.files[0]) return;
  try { PIC.data = await shrink(e.target.files[0]); $('#ph-prev').replaceWith(Object.assign(document.createElement('img'), { id: 'ph-prev', className: 'th lg', src: PIC.data })); $('#ph-rm').hidden = false; }
  catch (x) { toast(x.message, 'bad'); }
});
function itemForm(it) {
  PIC.data = null;
  const e = !!it; it = it || {};
  const admin = can('ADMIN');
  const stockField = e && admin
    ? `${fld('quantity', 'Stock quantity (leave blank to keep unchanged)', it.Quantity === '' ? '' : it.Quantity, 'type=number min=0 step=any')}${fld('stockReason', 'Reason for stock change', '', 'maxlength=300')}`
    : '';
  const stockHint = e && admin
    ? '<p class="mut sm">Admin can update stock here. Any quantity change is recorded in Transaction History and Audit Log; a reason is required.</p>'
    : e
      ? '<p class="mut sm">Stock quantity can only be changed by Admin. Use QR Stock Movement for normal Stock In / Stock Out.</p>'
      : '';
  modal(e ? 'Edit Item' : 'Add Item', `<div class="fg">${fld('name', 'Item name *', it.Name, 'required')}${sel('category', 'Category *', S.cats, it.Category)}
   ${fld('subcategory', 'Subcategory', it.Subcategory)}${fld('brand', 'Brand', it.Brand)}${fld('model', 'Model number', it.Model)}${sel('rack', 'Rack / location *', S.racks, it.Rack)}
   ${fld('unit', 'Unit *', it.Unit || 'PCS', 'required')}${fld('minStock', 'Minimum stock level', it.MinStock ?? 0, 'type=number min=0 step=any')}
   ${!e ? fld('quantity', 'Opening quantity (blank = needs count)', '', 'type=number min=0 step=any') : stockField}
   <div class="ph"><label>Photo (optional)</label><div class="phr">${it.ImageURL ? `<img class="th lg" id="ph-prev" alt="" src="${esc(imgUrl(it.ImageURL, 160))}">` : `<span class="th lg ph0" id="ph-prev">${NOPIC}</span>`}<input type="file" id="ph" accept="image/*" hidden><button type="button" class="btn g sm" id="ph-pick">Take or choose photo</button><button type="button" class="btn g sm" id="ph-rm" ${it.ImageURL ? '' : 'hidden'}>Remove</button></div><input type="hidden" name="imageUrl" value="${esc(it.ImageURL || '')}"></div>
   ${fld('description', 'Description', it.Description)}${fld('remarks', 'Remarks', it.Remarks)}</div>${stockHint}`,
    e ? 'Save changes' : 'Add item', async () => {}, '', d => {
      const photoData = PIC.data;
      PIC.data = null;
      const requestId = rid();
      bg(e ? 'Saving changes…' : 'Adding item…', async () => {
        if (photoData) d.imageUrl = (await api('uploadImage', { data: photoData, rid: rid() })).url;
        const action = e ? (admin ? 'adminUpdateItem' : 'editItem') : 'addItem';
        return api(action, { ...d, itemId: it.ItemID, rid: requestId });
      }, { ok: e ? 'Changes saved successfully' : 'Item added successfully', fail: 'Save failed', after: async result => {
        if (e && result && result.item) {
          const index = S.items.findIndex(x => x.ItemID === it.ItemID);
          if (index >= 0) {
            const merged = { ...S.items[index], ...result.item };
            const min = Number(merged.MinStock) || 0;
            merged.st = merged.Quantity === '' || merged.Quantity == null ? 'UNVERIFIED'
              : Number(merged.Quantity) <= 0 ? 'OUT' : Number(merged.Quantity) <= min ? 'LOW' : 'IN';
            S.items[index] = merged;
          }
          S.loaded = true;
        } else { S.loaded = false; await load(true); }
        if (isOn('inventory')) drawTable();
      } });
    });
}
function archive(id) {
  const it = S.items.find(i => i.ItemID === id);
  modalBg('Archive item', `<p>Archive <b>${esc(it.Name)}</b>? It leaves active inventory but its history is kept.</p>${fld('reason', 'Reason *', '', 'required')}`,
    'Archive', 'Archiving item…', d => api('archiveItem', { itemId: id, reason: d.reason, rid: rid() }),
    { ok: 'Item archived', fail: 'Archive failed', after: async () => { await load(true); if (isOn('inventory')) drawTable(); } });
}
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.qrLabel) { showQRLabel(b.dataset.qrLabel); return; }
  if (b.id === 'ph-pick') $('#ph').click();
  if (b.id === 'ph-rm') { PIC.data = null; document.querySelector('[name=imageUrl]').value = ''; $('#ph-prev').replaceWith(Object.assign(document.createElement('span'), { id: 'ph-prev', className: 'th lg ph0', innerHTML: NOPIC })); b.hidden = true; }
  if (b.id === 'add') itemForm();
  if (b.dataset.edit) itemForm(S.items.find(i => i.ItemID === b.dataset.edit));
  if (b.dataset.arch) archive(b.dataset.arch);
  if (b.id === 'arch') toggleArch(b);
  if (b.dataset.restore) restore(b.dataset.restore);
});

async function toggleArch(b) {
  S.showArch = !S.showArch; b.textContent = S.showArch ? 'Show active' : 'Show archived'; S.page = 1;
  if (S.showArch) { $('#tbl').innerHTML = loadingHTML('Loading archived items…'); try { S.archived = (await api('inventory', { archived: true })).items; } catch (e) { toast(e.message, 'bad'); S.showArch = false; b.textContent = 'Show archived'; } }
  const bulkBtn = document.getElementById('bulk-qr-open'); if (bulkBtn) bulkBtn.hidden = S.showArch;
  drawTable();
}
function restore(id) {
  const it = S.archived.find(i => i.ItemID === id);
  modalBg('Restore item', `<p>Restore <b>${esc(it.Name)}</b> to active inventory?</p>`, 'Restore', 'Restoring item…',
    () => api('restoreItem', { itemId: id, rid: rid() }),
    { ok: 'Item restored', fail: 'Restore failed', after: async () => { S.archived = S.archived.filter(i => i.ItemID !== id); await load(true); if (isOn('inventory')) drawTable(); } });
}