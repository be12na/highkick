const formAnggota = document.getElementById('form-login-anggota');
const formAdmin = document.getElementById('form-login-admin');
const btnAnggota = document.getElementById('btn-show-anggota');
const btnAdmin = document.getElementById('btn-show-admin');
const authMessage = document.getElementById('auth-message');
const togglePassword = document.getElementById('toggle-password');
const inputPassword = document.getElementById('password_pin');
const iconEye = document.getElementById('icon-eye');
const iconEyeOff = document.getElementById('icon-eye-off');

// Tab toggles
btnAnggota?.addEventListener('click', () => {
  btnAnggota.classList.add('active');
  btnAdmin.classList.remove('active');
  formAnggota?.classList.remove('hidden');
  formAdmin?.classList.add('hidden');
  clearErrors();
});

btnAdmin?.addEventListener('click', () => {
  btnAdmin.classList.add('active');
  btnAnggota.classList.remove('active');
  formAdmin?.classList.remove('hidden');
  formAnggota?.classList.add('hidden');
  clearErrors();
});

// Password toggle
togglePassword?.addEventListener('click', () => {
  const type = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
  inputPassword.setAttribute('type', type);
  if (type === 'text') {
    iconEye.classList.add('hidden');
    iconEyeOff.classList.remove('hidden');
  } else {
    iconEye.classList.remove('hidden');
    iconEyeOff.classList.add('hidden');
  }
});

function clearErrors() {
  document.querySelectorAll('.input-group input').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.validation-msg').forEach(el => el.textContent = '');
  if (authMessage) authMessage.textContent = '';
  if (authMessage) authMessage.className = 'message';
}

function setError(id, message) {
  const input = document.getElementById(id);
  const msgDiv = document.getElementById(`msg-${id.replace('_', '-')}`);
  if (input) input.classList.add('error');
  if (msgDiv) msgDiv.textContent = message;
}

function removeError(id) {
  const input = document.getElementById(id);
  const msgDiv = document.getElementById(`msg-${id.replace('_', '-')}`);
  if (input) input.classList.remove('error');
  if (msgDiv) msgDiv.textContent = '';
}

function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const loader = btn.querySelector('.btn-loader');
  const text = btn.querySelector('.btn-text');
  
  if (isLoading) {
    btn.disabled = true;
    loader?.classList.remove('hidden');
  } else {
    btn.disabled = false;
    loader?.classList.add('hidden');
  }
}

// Real-time validation
document.getElementById('nomor_anggota')?.addEventListener('input', (e) => {
  if (e.target.value.trim().length > 0) removeError('nomor_anggota');
});
document.getElementById('email_admin')?.addEventListener('input', (e) => {
  if (e.target.value.trim().length > 0 && e.target.value.includes('@')) removeError('email_admin');
});
document.getElementById('password_pin')?.addEventListener('input', (e) => {
  if (e.target.value.trim().length > 0) removeError('password_pin');
});

// Check local storage for remember me options
window.addEventListener('DOMContentLoaded', () => {
  const savedAnggota = localStorage.getItem('saved_nomor_anggota');
  if (savedAnggota && document.getElementById('nomor_anggota')) {
    document.getElementById('nomor_anggota').value = savedAnggota;
    document.getElementById('remember-anggota').checked = true;
  }
  const savedAdminEmail = localStorage.getItem('saved_email_admin');
  if (savedAdminEmail && document.getElementById('email_admin')) {
    document.getElementById('email_admin').value = savedAdminEmail;
    document.getElementById('remember-admin').checked = true;
  }
});

formAnggota?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const nomor = document.getElementById('nomor_anggota').value.trim();
  if (!nomor) {
    setError('nomor_anggota', 'Nomor anggota wajib diisi');
    return;
  }

  setLoading('btn-submit-anggota', true);

  try {
    const payload = formToObject(formAnggota);
    const res = await postApi('/api/login-anggota', payload);
    if (!res.data || !res.data.login) {
      throw new Error('Nomor anggota tidak ditemukan');
    }
    
    // Handle remember me
    const remember = document.getElementById('remember-anggota')?.checked;
    if (remember) {
      localStorage.setItem('saved_nomor_anggota', payload.nomor_anggota);
    } else {
      localStorage.removeItem('saved_nomor_anggota');
    }

    localStorage.setItem('nomor_anggota', payload.nomor_anggota);
    window.location.href = '/anggota.html';
  } catch (err) {
    showMessage(authMessage, err.message, true);
    if (authMessage) authMessage.classList.add('error');
  } finally {
    setLoading('btn-submit-anggota', false);
  }
});

formAdmin?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  
  const email = document.getElementById('email_admin').value.trim();
  const pass = document.getElementById('password_pin').value.trim();
  let isValid = true;
  
  if (!email) {
    setError('email_admin', 'Email admin wajib diisi');
    isValid = false;
  } else if (!email.includes('@')) {
    setError('email_admin', 'Format email tidak valid');
    isValid = false;
  }
  
  if (!pass) {
    setError('password_pin', 'Password wajib diisi');
    isValid = false;
  }

  if (!isValid) return;

  setLoading('btn-submit-admin', true);

  try {
    const payload = formToObject(formAdmin);

    const res = await postApi(
      '/api/login-admin',
      {
        email_admin: payload.email_admin,
        password_pin: payload.password_pin,
      },
      false,
    );

    if (!res.data || !res.data.login) {
      throw new Error('Login admin gagal periksa kembali kredensial');
    }

    // Handle remember me
    const remember = document.getElementById('remember-admin')?.checked;
    if (remember) {
      localStorage.setItem('saved_email_admin', payload.email_admin);
    } else {
      localStorage.removeItem('saved_email_admin');
    }

    localStorage.setItem('admin_token', res.data.admin.admin_token || '');
    localStorage.setItem('admin_profile', JSON.stringify(res.data.admin || {}));
    
    // Use window.location.replace to redirect to dashboard cleanly
    window.location.replace('/admin.html');
  } catch (err) {
    showMessage(authMessage, err.message, true);
    if (authMessage) authMessage.classList.add('error');
  } finally {
    setLoading('btn-submit-admin', false);
  }
});
