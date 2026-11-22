// HEIMS install experience (PWA)
(() => {
  let deferredPrompt = null;
  const btn = document.getElementById('installApp');
  if (!btn) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) {
    btn.innerHTML = '<span aria-hidden="true">✓</span> App installed';
    btn.disabled = true;
    btn.title = 'HEIMS is already installed on this device';
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('HEIMS offline support:', err)));
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferredPrompt = event;
    if (!standalone) { btn.hidden = false; btn.disabled = false; btn.textContent = 'Install App'; }
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null; btn.textContent = 'App installed'; btn.disabled = true;
  });
  btn.addEventListener('click', async () => {
    if (standalone) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') btn.textContent = 'Installing…';
      deferredPrompt = null;
      return;
    }
    if (isIOS) {
      alert('To install HEIMS on iPhone/iPad:\n1. Open this page in Safari.\n2. Tap the Share button.\n3. Choose “Add to Home Screen”.\n4. Tap Add.');
    } else {
      alert('To install HEIMS, open the browser menu and choose “Install app” or “Add to Home screen”. If the option is unavailable, check that the site is served over HTTPS and reload the page.');
    }
  });
  // Keep a discoverable button even before the browser fires beforeinstallprompt.
  if (!standalone) btn.hidden = false;
})();
