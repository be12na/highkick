function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return String(value);
  }
  return dt.toLocaleDateString('id-ID');
}

function showMessage(el, text, isError = false) {
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#b91c1c' : '#0f766e';
}

function formToObject(form) {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) {
    obj[k] = typeof v === 'string' ? v.trim() : v;
  }
  return obj;
}

// === PWA Logic ===
let deferredPrompt;
const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Pastikan path sw.js benar sesuai struktur directory (berada didalam /web/)
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.log('ServiceWorker error:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
    showNotification('Berhasil Terinstal', 'Aplikasi Highkick Taekwondo siap digunakan!');
    console.log('[Analytics] PWA_Install_Conversion: Success');
  });
}

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="position:fixed; bottom:24px; left:50%; transform:translateX(-50%); width:max-content; max-width:90vw; background:#ffffff; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); padding:16px; display:flex; align-items:center; gap:20px; z-index:9999; border: 1px solid #e5e7eb; animation: slideUp 0.4s ease-out;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="/assets/highkick-logo.jpg" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
        <div style="text-align:left;">
          <strong style="display:block; font-size:14px; color:#1f2937; margin-bottom:2px;">Aplikasi Highkick</strong>
          <small style="color:#6b7280; font-size:12px;">Instal agar lebih cepat & ringan</small>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button id="pwa-install-btn" style="background:#2563eb; color:white; border:none; border-radius:8px; padding:8px 16px; font-size: 13px; font-weight:600; cursor:pointer; transition: background 0.2s;">Instal</button>
        <button id="pwa-dismiss-btn" style="background:transparent; color:#9ca3af; border:none; padding:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;" aria-label="Tutup"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
    <style>@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }</style>
  `;
  document.body.appendChild(banner);

  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      console.log('[Analytics] PWA_Install_Clicked');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[Analytics] PWA_Install_Outcome:', outcome);
      deferredPrompt = null;
      hideInstallBanner();
    }
  });

  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    hideInstallBanner();
    console.log('[Analytics] PWA_Install_Dismissed');
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.3s ease';
    setTimeout(() => banner.remove(), 300);
  }
}

function showNotification(title, message) {
  const notif = document.createElement('div');
  notif.style.cssText = `position:fixed; top:24px; left:50%; transform:translateX(-50%); background:#10b981; color:white; padding:12px 20px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); z-index:10000; transition: opacity 0.3s, transform 0.3s; text-align:center; animation: slideDown 0.3s ease-out;`;
  notif.innerHTML = `
    <style>@keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }</style>
    <strong style="display:block; font-size:14px; margin-bottom:4px;">${title}</strong>
    <div style="font-size:13px; opacity:0.9;">${message}</div>
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

setupPWA();
