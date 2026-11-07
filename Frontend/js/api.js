async function api(action, payload = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
  try {
    // text/plain body = "simple request" (no CORS preflight; Apps Script cannot answer OPTIONS)
    const r = await fetch(CONFIG.API_URL, { method: 'POST', signal: ctl.signal,
      body: JSON.stringify({ action, payload, token: sessionStorage.getItem('token') }) });
    const j = await r.json();
    if (!j.ok) { if (j.code === 'AUTH' && action !== 'login') logout(true); throw new Error(j.error); }
    return j.data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out. Try again.');
    if (e instanceof TypeError) throw new Error('Cannot reach server. Check internet / API URL in config.js.');
    throw e;
  } finally { clearTimeout(timer); }
}
