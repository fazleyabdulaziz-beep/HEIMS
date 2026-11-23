async function raw(action, payload) {
  const clientStarted = performance.now();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
  try {
    // text/plain body = "simple request" (no CORS preflight; Apps Script cannot answer OPTIONS)
    const r = await fetch(CONFIG.API_URL, { method: 'POST', signal: ctl.signal,
      body: JSON.stringify({ action, payload, token: sessionStorage.getItem('token') }) });
    const j = await r.json();
    console.info('[HEIMS API timing]', action, {
      clientRoundTripMs: Math.round(performance.now() - clientStarted),
      serverMs: j.meta && j.meta.serverMs,
      lockWaitMs: j.meta && j.meta.lockWaitMs,
      lockWorkMs: j.meta && j.meta.lockWorkMs
    });
    if (!j.ok) throw Object.assign(new Error(j.error), { code: j.code });
    return j.data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out. Try again.');
    if (e instanceof TypeError) throw new Error('Cannot reach server. Check internet / API URL in config.js.');
    throw e;
  } finally { clearTimeout(timer); }
}
function saveSession(r) { sessionStorage.token = r.token; sessionStorage.user = JSON.stringify(r.user); sessionStorage.hotel = r.hotel || ''; }
let _res = null;
function resumeSession() {   // trade the saved device key for a fresh session (no password stored on the phone)
  return _res || (_res = raw('resume', { rt: localStorage.rt }).then(r => { saveSession(r); return r; })
    .catch(e => { if (e.code === 'AUTH') localStorage.removeItem('rt'); throw e; }).finally(() => _res = null));
}
// Short-lived in-memory read cache + in-flight request deduplication.
// Mutations clear all read caches so stock quantities never remain stale after a write.
const API_READ_TTL = { inventory: 20000, dashboard: 15000, history: 12000, auditLog: 12000,
  listOrders: 12000, listUsers: 15000, getSettings: 30000, stockVerificationDashboard: 10000 };
const _apiCache = new Map(), _apiPending = new Map();
const API_WRITES = new Set(['uploadImage','addItem','editItem','archiveItem','restoreItem','addLocation','transferItems',
  'stockIn','stockOut','adjustStock','adminUpdateItem','changePassword','saveUser','resetPassword','addCategory','renameCategory',
  'saveSettings','createOrder','receiveOrder','cancelOrder','recordStockCheck']);
function clearApiCache() { _apiCache.clear(); if (typeof S !== 'undefined') S.loaded = false; }
async function request(action, payload) {
  try { return await raw(action, payload); }
  catch (e) {
    if (e.code !== 'AUTH' || action === 'login' || action === 'resume') throw e;
    if (localStorage.rt) { try { await resumeSession(); return await raw(action, payload); } catch (e2) { if (e2.code === 'AUTH') logout(true); throw e2; } }
    logout(true); throw e;
  }
}
async function api(action, payload = {}) {
  const ttl = API_READ_TTL[action];
  const key = ttl ? action + ':' + JSON.stringify(payload || {}) : '';
  if (ttl) {
    const hit = _apiCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;
    if (_apiPending.has(key)) return _apiPending.get(key);
  }
  if (API_WRITES.has(action)) clearApiCache();
  const task = request(action, payload).then(data => {
    if (ttl) _apiCache.set(key, { data, expires: Date.now() + ttl });
    if (API_WRITES.has(action)) clearApiCache();
    return data;
  }).catch(err => { if (ttl) _apiCache.delete(key); throw err; }).finally(() => {
    if (ttl) _apiPending.delete(key);
  });
  if (ttl) _apiPending.set(key, task);
  return task;
}
