const nomorAnggota = localStorage.getItem('nomor_anggota') || '';
const anggotaMessage = document.getElementById('anggota-message');

const profilNamaGreet = document.getElementById('profil-nama-greet');
const profilNama = document.getElementById('profil-nama');
const profilNomor = document.getElementById('profil-nomor');
const profilDojo = document.getElementById('profil-dojo');
const profilTgl = document.getElementById('profil-tgl');
const profilStatus = document.getElementById('profil-status');
const profilSabuk = document.getElementById('profil-sabuk');
const profilPeringkat = document.getElementById('profil-peringkat');

const sumTagihan = document.getElementById('sum-tagihan');
const sumBayar = document.getElementById('sum-bayar');
const sumTunggakan = document.getElementById('sum-tunggakan');

const tableBulanan = document.getElementById('table-bulanan');
const tableKas = document.getElementById('table-kas');

const pageLoader = document.getElementById('page-loader');
const viewSections = Array.from(document.querySelectorAll('.view-section'));
const navLinks = Array.from(document.querySelectorAll('.admin-nav__link[data-target], .admin-nav__sublink[data-target]'));
const navToggles = Array.from(document.querySelectorAll('.nav-toggle'));

const sidebar = document.getElementById('admin-sidebar');
const sidebarBackdrop = document.getElementById('admin-sidebar-backdrop');
const sidebarToggle = document.getElementById('btn-sidebar-toggle');
const sidebarClose = document.getElementById('btn-sidebar-close');

let currentView = 'section-profil';

document.getElementById('btn-logout-anggota')?.addEventListener('click', () => {
  localStorage.removeItem('nomor_anggota');
  window.location.href = '/index.html';
});

// Sidebar logic
sidebarToggle?.addEventListener('click', () => toggleSidebar(true));
sidebarClose?.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop?.addEventListener('click', () => toggleSidebar(false));

function toggleSidebar(forceOpen) {
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !document.body.classList.contains('admin-sidebar-open');
  document.body.classList.toggle('admin-sidebar-open', shouldOpen);
  if (sidebarBackdrop) sidebarBackdrop.hidden = !shouldOpen;
  if (sidebar) sidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : String(window.innerWidth <= 1080));
  if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(shouldOpen));
}

// Navigation functionality
navToggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isExpanded);
  });
});

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    if (target) switchView(target);
  });
});

async function switchView(targetId) {
  if (currentView === targetId && document.getElementById(targetId) && !document.getElementById(targetId).classList.contains('hidden')) return;
  currentView = targetId;

  // Set active link
  navLinks.forEach((link) => {
    const isActive = link.dataset.target === targetId;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (window.innerWidth <= 1080) {
    toggleSidebar(false);
  }

  // Hide all view sections
  viewSections.forEach(sec => sec.classList.add('hidden'));
  if (pageLoader) pageLoader.classList.remove('hidden');

  // Short delay for visual polish (fake lazy loading)
  await new Promise(r => setTimeout(r, 400));
  
  if (pageLoader) pageLoader.classList.add('hidden');
  
  // Show target
  const targetSec = document.getElementById(targetId);
  if (targetSec) targetSec.classList.remove('hidden');
  
  // If showing a section that needs shared cards, ensure they're shown if they were hidden
  const sharedCards = document.querySelector('.view-section-shared');
  if (sharedCards && targetId === 'section-profil') {
    sharedCards.classList.remove('hidden');
  }
}

function renderHistory(tableEl, rows) {
  tableEl.innerHTML = rows.length > 0 ? rows.map((r) => {
    return `<tr>
      <td>${r.periode || '-'}</td>
      <td>${formatRupiah(r.nominal_tagihan || 0)}</td>
      <td>${formatRupiah(r.nominal_bayar || 0)}</td>
      <td><span class="admin-status-pill" data-status="${r.status_pembayaran || ''}">${r.status_pembayaran || '-'}</span></td>
    </tr>`;
  }).join('') : `<tr class="admin-empty-row"><td colspan="4"><div class="admin-empty-state">Belum ada riwayat pembayaran</div></td></tr>`;
}

async function initAnggotaPage() {
  if (!nomorAnggota) {
    window.location.href = '/index.html';
    return;
  }
  
  if (pageLoader) pageLoader.classList.remove('hidden');

  try {
    const res = await postApi('/api/dashboard-anggota', { nomor_anggota: nomorAnggota });
    const d = res.data || {};
    const profil = d.profil || {};

    if (profilNamaGreet) profilNamaGreet.textContent = profil.nama_lengkap || 'Anggota';
    profilNama.textContent = profil.nama_lengkap || '-';
    profilNomor.textContent = profil.nomor_anggota || '-';
    profilDojo.textContent = profil.dojo_cabang || '-';
    profilTgl.textContent = formatDate(profil.tanggal_bergabung);
    profilStatus.textContent = profil.status_anggota || '-';
    profilStatus.dataset.status = profil.status_anggota || '';
    profilSabuk.textContent = profil.tingkatan_sabuk || '-';
    profilPeringkat.textContent = profil.peringkat || '-';

    sumTagihan.textContent = formatRupiah(d.ringkasan?.total_tagihan || 0);
    sumBayar.textContent = formatRupiah(d.ringkasan?.total_bayar || 0);
    sumTunggakan.textContent = formatRupiah(d.ringkasan?.total_tunggakan || 0);

    renderHistory(tableBulanan, d.iuran_bulanan || []);
    renderHistory(tableKas, d.iuran_kas || []);
  } catch (err) {
    if (anggotaMessage) {
      anggotaMessage.classList.remove('hidden');
      showMessage(anggotaMessage, err.message, true);
    }
  } finally {
    if (pageLoader) pageLoader.classList.add('hidden');
  }
}

initAnggotaPage();
