function listAnggota_(spreadsheetId) {
  return getAllObjects_(spreadsheetId, SHEET_NAMES.anggota);
}

function getAnggotaByNomor_(spreadsheetId, nomorAnggota) {
  const target = normalize_(nomorAnggota);
  if (!target) {
    throw new Error('nomor_anggota wajib diisi');
  }

  const anggota = listAnggota_(spreadsheetId);
  return anggota.find((a) => normalize_(a.nomor_anggota) === target) || null;
}

function saveAnggota_(spreadsheetId, payload) {
  const mode = normalize_(payload.mode).toLowerCase();
  if (mode === 'list') {
    return listAnggota_(spreadsheetId);
  }

  const nomorAnggota = normalize_(payload.nomor_anggota);
  const namaLengkap = normalize_(payload.nama_lengkap);
  const statusAnggota = normalize_(payload.status_anggota || 'Aktif');

  if (!nomorAnggota) {
    throw new Error('nomor_anggota wajib diisi');
  }
  if (!namaLengkap) {
    throw new Error('nama_lengkap wajib diisi');
  }
  if (ALLOWED_MEMBER_STATUS.indexOf(statusAnggota) === -1) {
    throw new Error('status_anggota hanya boleh Aktif, Nonaktif, atau Cuti');
  }

  const existing = listAnggota_(spreadsheetId);
  const memberId = normalize_(payload.member_id);

  const duplicate = existing.find((a) => {
    const sameNumber = normalize_(a.nomor_anggota) === nomorAnggota;
    const sameMember = normalize_(a.member_id) === memberId;
    return sameNumber && (!memberId || !sameMember);
  });

  if (duplicate) {
    throw new Error('nomor_anggota sudah digunakan anggota lain');
  }

  const now = nowIso_();
  const finalPayload = Object.assign({}, payload, {
    nomor_anggota: nomorAnggota,
    nama_lengkap: namaLengkap,
    status_anggota: statusAnggota,
    updated_at: now,
  });

  if (!memberId) {
    finalPayload.member_id = generateId_('mbr');
    finalPayload.created_at = now;
    appendObject_(spreadsheetId, SHEET_NAMES.anggota, finalPayload);
    return finalPayload;
  }

  return upsertByField_(spreadsheetId, SHEET_NAMES.anggota, 'member_id', memberId, finalPayload);
}
