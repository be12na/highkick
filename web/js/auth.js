const formAnggota = document.getElementById('form-login-anggota');
const formAdmin = document.getElementById('form-login-admin');
const btnAnggota = document.getElementById('btn-show-anggota');
const btnAdmin = document.getElementById('btn-show-admin');
const authMessage = document.getElementById('auth-message');

btnAnggota?.addEventListener('click', () => {
  formAnggota?.classList.remove('hidden');
  formAdmin?.classList.add('hidden');
});

btnAdmin?.addEventListener('click', () => {
  formAdmin?.classList.remove('hidden');
  formAnggota?.classList.add('hidden');
});

formAnggota?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formAnggota);
    const res = await postApi('/api/login-anggota', payload);
    if (!res.data || !res.data.login) {
      throw new Error('Nomor anggota tidak ditemukan');
    }
    localStorage.setItem('nomor_anggota', payload.nomor_anggota);
    window.location.href = '/anggota.html';
  } catch (err) {
    showMessage(authMessage, err.message, true);
  }
});

formAdmin?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = formToObject(formAdmin);
    localStorage.setItem('admin_api_key', payload.admin_api_key || '');

    const res = await postApi(
      '/api/login-admin',
      {
        email_admin: payload.email_admin,
        password_pin: payload.password_pin,
      },
      false,
    );

    if (!res.data || !res.data.login) {
      throw new Error('Login admin gagal');
    }

    localStorage.setItem('admin_profile', JSON.stringify(res.data.admin || {}));
    window.location.href = '/admin.html';
  } catch (err) {
    showMessage(authMessage, err.message, true);
  }
});
