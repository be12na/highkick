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
