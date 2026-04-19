const msg = document.getElementById('admin-message');

const sumTotal = document.getElementById('sum-total-anggota');
const sumAktif = document.getElementById('sum-aktif');
const sumTunggakanBulanan = document.getElementById('sum-tunggakan-bulanan');
const sumTunggakanKas = document.getElementById('sum-tunggakan-kas');
const tableAnggota = document.getElementById('table-anggota');

const formAnggota = document.getElementById('form-anggota');
const formSetting = document.getElementById('form-setting-iuran');
const formBulanan = document.getElementById('form-iuran-bulanan');
const formKas = document.getElementById('form-iuran-kas');
const btnLogout = document.getElementById('btn-logout-admin');

btnLogout?.addEventListener('click', () => {
  localStorage.removeItem('admin_api_key');
  localStorage.removeItem('admin_profile');
  window.location.href = '/index.html';
});

formAnggota?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formAnggota);
    const res = await postApi('/api/admin/anggota', payload, true);
    showMessage(msg, res.message);
    formAnggota.reset();
    await loadAnggotaTable();
    await loadDashboardSummary();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});

formSetting?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formSetting);
    payload.aktif = String(payload.aktif) === 'true';
    const res = await postApi('/api/admin/setting-iuran', payload, true);
    showMessage(msg, res.message);
    formSetting.reset();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});

formBulanan?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formBulanan);
    const res = await postApi('/api/admin/iuran-bulanan', payload, true);
    showMessage(msg, res.message);
    formBulanan.reset();
    await loadDashboardSummary();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});

formKas?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formKas);
    const res = await postApi('/api/admin/iuran-kas', payload, true);
    showMessage(msg, res.message);
    formKas.reset();
    await loadDashboardSummary();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});

async function loadDashboardSummary() {
  const res = await postApi('/api/dashboard-admin', {}, true);
  const d = res.data || {};

  sumTotal.textContent = d.total_anggota ?? '-';
  sumAktif.textContent = d.total_anggota_aktif ?? '-';
  sumTunggakanBulanan.textContent = formatRupiah(d.total_tunggakan_bulanan || 0);
  sumTunggakanKas.textContent = formatRupiah(d.total_tunggakan_kas || 0);
}

async function loadAnggotaTable() {
  const res = await postApi('/api/admin/anggota', { mode: 'list' }, true);
  const rows = Array.isArray(res.data) ? res.data : [];
  tableAnggota.innerHTML = rows
    .map((r) => {
      return `<tr>
        <td>${r.nomor_anggota || '-'}</td>
        <td>${r.nama_lengkap || '-'}</td>
        <td>${r.tingkatan_sabuk || '-'}</td>
        <td>${r.peringkat || '-'}</td>
        <td>${r.status_anggota || '-'}</td>
      </tr>`;
    })
    .join('');
}

async function initAdminPage() {
  const key = localStorage.getItem('admin_api_key');
if (!key) {
    window.location.href = '/index.html';
    return;
  }
  try {
    await loadDashboardSummary();
    await loadAnggotaTable();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
}

initAdminPage();
