function loginAnggota_(spreadsheetId, payload) {
  const nomorAnggota = normalize_(payload.nomor_anggota);
  if (!nomorAnggota) {
    throw new Error('nomor_anggota wajib diisi');
  }

  const anggota = getAllObjects_(spreadsheetId, SHEET_NAMES.anggota);
  const found = anggota.find((a) => normalize_(a.nomor_anggota) === nomorAnggota);

  if (!found) {
    return {
      login: false,
      role: 'anggota',
      profil: null,
    };
  }

  return {
    login: true,
    role: 'anggota',
    profil: found,
  };
}

function loginAdmin_(spreadsheetId, payload) {
  const email = normalize_(payload.email_admin).toLowerCase();
  const passwordPin = normalize_(payload.password_pin);

  if (!email || !passwordPin) {
    throw new Error('email_admin dan password_pin wajib diisi');
  }

  const admins = getAllObjects_(spreadsheetId, SHEET_NAMES.adminUser);
  const found = admins.find((a) => {
    return (
      normalize_(a.email_admin).toLowerCase() === email &&
      normalize_(a.password_pin) === passwordPin &&
      normalize_(a.status_aktif).toLowerCase() !== 'false'
    );
  });

  if (!found) {
    return {
      login: false,
      role: 'admin',
      admin: null,
    };
  }

  return {
    login: true,
    role: 'admin',
    admin: {
      admin_id: found.admin_id,
      nama_admin: found.nama_admin,
      email_admin: found.email_admin,
      role: found.role,
    },
  };
}

function assertInternalAdminKey_(providedKey) {
  const envKey = PropertiesService.getScriptProperties().getProperty('INTERNAL_API_KEY');
  if (!envKey) {
    throw new Error('INTERNAL_API_KEY belum diset di Script Properties');
  }
  if (normalize_(providedKey) !== normalize_(envKey)) {
    throw new Error('Internal API key tidak valid');
  }
}
