function getIuranKasByAnggota_(spreadsheetId, nomorAnggota) {
  const target = normalize_(nomorAnggota);
  return getAllObjects_(spreadsheetId, SHEET_NAMES.iuranKas)
    .filter((r) => normalize_(r.nomor_anggota) === target)
    .map((r) => mapStatusIuran_(r))
    .sort((a, b) => normalize_(b.periode).localeCompare(normalize_(a.periode)));
}

function saveIuranKas_(spreadsheetId, payload) {
  const nomorAnggota = normalize_(payload.nomor_anggota);
  const periode = normalize_(payload.periode);
  if (!nomorAnggota) {
    throw new Error('nomor_anggota wajib diisi');
  }
  validatePeriod_(periode);

  validateNominal_(payload.nominal_bayar, 'nominal_bayar');

  const anggota = getAnggotaByNomor_(spreadsheetId, nomorAnggota);
  if (!anggota) {
    throw new Error('nomor_anggota tidak ditemukan');
  }

  const nominalTagihan = resolveNominalByType_(spreadsheetId, 'kas', periode, payload.nominal_tagihan);
  const nominalBayar = toNumber_(payload.nominal_bayar);
  const status = paymentStatus_(nominalTagihan, nominalBayar);

  const finalPayload = Object.assign({}, payload, {
    kas_id: normalize_(payload.kas_id) || generateId_('iks'),
    nomor_anggota: nomorAnggota,
    periode,
    nominal_tagihan: nominalTagihan,
    nominal_bayar: nominalBayar,
    status_pembayaran: status,
    tanggal_bayar: normalize_(payload.tanggal_bayar) || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    created_at: nowIso_(),
  });

  appendObject_(spreadsheetId, SHEET_NAMES.iuranKas, finalPayload);
  return finalPayload;
}
