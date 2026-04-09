const nomorAnggota = localStorage.getItem('nomor_anggota') || '';
const anggotaMessage = document.getElementById('anggota-message');

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

document.getElementById('btn-logout-anggota')?.addEventListener('click', () => {
  localStorage.removeItem('nomor_anggota');
  window.location.href = './index.html';
});

function renderHistory(tableEl, rows) {
  tableEl.innerHTML = rows
    .map((r) => {
      return `<tr>
        <td>${r.periode || '-'}</td>
        <td>${formatRupiah(r.nominal_tagihan || 0)}</td>
        <td>${formatRupiah(r.nominal_bayar || 0)}</td>
        <td>${r.status_pembayaran || '-'}</td>
      </tr>`;
    })
    .join('');
}

async function initAnggotaPage() {
  if (!nomorAnggota) {
    window.location.href = './index.html';
    return;
  }

  try {
    const res = await postApi('/api/dashboard-anggota', { nomor_anggota: nomorAnggota });
    const d = res.data || {};
    const profil = d.profil || {};

    profilNama.textContent = profil.nama_lengkap || '-';
    profilNomor.textContent = profil.nomor_anggota || '-';
    profilDojo.textContent = profil.dojo_cabang || '-';
    profilTgl.textContent = formatDate(profil.tanggal_bergabung);
    profilStatus.textContent = profil.status_anggota || '-';
    profilSabuk.textContent = profil.tingkatan_sabuk || '-';
    profilPeringkat.textContent = profil.peringkat || '-';

    sumTagihan.textContent = formatRupiah(d.ringkasan?.total_tagihan || 0);
    sumBayar.textContent = formatRupiah(d.ringkasan?.total_bayar || 0);
    sumTunggakan.textContent = formatRupiah(d.ringkasan?.total_tunggakan || 0);

    renderHistory(tableBulanan, d.iuran_bulanan || []);
    renderHistory(tableKas, d.iuran_kas || []);
  } catch (err) {
    showMessage(anggotaMessage, err.message, true);
  }
}

initAnggotaPage();
