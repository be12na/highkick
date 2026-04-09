function getDashboardAnggota_(spreadsheetId, payload) {
  const nomorAnggota = normalize_(payload.nomor_anggota);
  if (!nomorAnggota) {
    throw new Error('nomor_anggota wajib diisi');
  }

  const profil = getAnggotaByNomor_(spreadsheetId, nomorAnggota);
  if (!profil) {
    throw new Error('Anggota tidak ditemukan');
  }

  const bulanan = getIuranBulananByAnggota_(spreadsheetId, nomorAnggota);
  const kas = getIuranKasByAnggota_(spreadsheetId, nomorAnggota);

  const totalTagihan = sumBy_(bulanan, 'nominal_tagihan') + sumBy_(kas, 'nominal_tagihan');
  const totalBayar = sumBy_(bulanan, 'nominal_bayar') + sumBy_(kas, 'nominal_bayar');

  return {
    profil,
    iuran_bulanan: bulanan,
    iuran_kas: kas,
    ringkasan: {
      total_tagihan: totalTagihan,
      total_bayar: totalBayar,
      total_tunggakan: Math.max(totalTagihan - totalBayar, 0),
    },
  };
}

function getDashboardAdmin_(spreadsheetId) {
  const anggota = listAnggota_(spreadsheetId);
  const bulanan = getAllObjects_(spreadsheetId, SHEET_NAMES.iuranBulanan).map((r) => mapStatusIuran_(r));
  const kas = getAllObjects_(spreadsheetId, SHEET_NAMES.iuranKas).map((r) => mapStatusIuran_(r));

  const totalAktif = anggota.filter((a) => normalize_(a.status_anggota) === 'Aktif').length;
  const totalNonaktif = anggota.filter((a) => normalize_(a.status_anggota) === 'Nonaktif').length;
  const totalCuti = anggota.filter((a) => normalize_(a.status_anggota) === 'Cuti').length;

  return {
    total_anggota: anggota.length,
    total_anggota_aktif: totalAktif,
    total_anggota_nonaktif: totalNonaktif,
    total_anggota_cuti: totalCuti,
    total_tunggakan_bulanan: totalOutstanding_(bulanan),
    total_tunggakan_kas: totalOutstanding_(kas),
  };
}

function getSettingIuran_(spreadsheetId) {
  return getAllObjects_(spreadsheetId, SHEET_NAMES.settingIuran);
}

function updateSettingIuran_(spreadsheetId, payload) {
  const mode = normalize_(payload.mode).toLowerCase();
  if (mode === 'list') {
    return getSettingIuran_(spreadsheetId);
  }

  const namaIuran = normalize_(payload.nama_iuran);
  const tipeIuran = normalize_(payload.tipe_iuran).toLowerCase();
  if (!namaIuran) {
    throw new Error('nama_iuran wajib diisi');
  }
  if (!tipeIuran) {
    throw new Error('tipe_iuran wajib diisi');
  }
  validateNominal_(payload.nominal_default, 'nominal_default');

  const finalPayload = Object.assign({}, payload, {
    setting_id: normalize_(payload.setting_id) || generateId_('set'),
    nama_iuran: namaIuran,
    tipe_iuran: tipeIuran,
    nominal_default: toNumber_(payload.nominal_default),
    aktif: payload.aktif === false ? false : true,
    mulai_berlaku:
      normalize_(payload.mulai_berlaku) ||
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM'),
    updated_at: nowIso_(),
  });

  if (!normalize_(payload.setting_id)) {
    finalPayload.created_at = nowIso_();
    appendObject_(spreadsheetId, SHEET_NAMES.settingIuran, finalPayload);
    return finalPayload;
  }

  return upsertByField_(spreadsheetId, SHEET_NAMES.settingIuran, 'setting_id', payload.setting_id, finalPayload);
}

function resolveNominalByType_(spreadsheetId, typeName, periode, overrideNominal) {
  if (normalize_(overrideNominal) !== '') {
    validateNominal_(overrideNominal, 'nominal_tagihan');
    return toNumber_(overrideNominal);
  }

  const allSetting = getAllObjects_(spreadsheetId, SHEET_NAMES.settingIuran)
    .filter((s) => normalize_(s.tipe_iuran).toLowerCase() === typeName)
    .filter((s) => {
      const flag = normalize_(s.aktif).toLowerCase();
      return flag === 'true' || flag === 'aktif' || flag === '1' || flag === 'yes';
    })
    .filter((s) => {
      const mulai = normalize_(s.mulai_berlaku);
      return !mulai || mulai <= periode;
    })
    .sort((a, b) => normalize_(b.mulai_berlaku).localeCompare(normalize_(a.mulai_berlaku)));

  if (!allSetting.length) {
    throw new Error('Setting iuran aktif untuk tipe ' + typeName + ' belum ada');
  }

  return toNumber_(allSetting[0].nominal_default);
}

function mapStatusIuran_(row) {
  const nominalTagihan = toNumber_(row.nominal_tagihan);
  const nominalBayar = toNumber_(row.nominal_bayar);
  return Object.assign({}, row, {
    nominal_tagihan: nominalTagihan,
    nominal_bayar: nominalBayar,
    status_pembayaran: paymentStatus_(nominalTagihan, nominalBayar),
  });
}

function sumBy_(rows, key) {
  return rows.reduce((acc, item) => acc + toNumber_(item[key]), 0);
}

function totalOutstanding_(rows) {
  return rows.reduce((acc, row) => {
    const due = Math.max(toNumber_(row.nominal_tagihan) - toNumber_(row.nominal_bayar), 0);
    return acc + due;
  }, 0);
}
