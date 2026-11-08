async function raw(action, payload) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
  try {
    // text/plain body = "simple request" (no CORS preflight; Apps Script cannot answer OPTIONS)
    const r = await fetch(CONFIG.API_URL, { method: 'POST', signal: ctl.signal,
      body: JSON.stringify({ action, payload, token: sessionStorage.getItem('token') }) });
    const j = await r.json();
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
async function api(action, payload = {}) {
  try { return await raw(action, payload); }
  catch (e) {
    if (e.code !== 'AUTH' || action === 'login' || action === 'resume') throw e;
    if (localStorage.rt) { try { await resumeSession(); return await raw(action, payload); } catch (e2) { if (e2.code === 'AUTH') logout(true); throw e2; } }
    logout(true); throw e;
  }
}
