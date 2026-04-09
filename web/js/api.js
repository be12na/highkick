const API_BASE = window.API_BASE || '';

async function postApi(path, payload, withAdminKey = false) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (withAdminKey) {
    const adminKey = localStorage.getItem('admin_api_key') || '';
    headers['x-admin-api-key'] = adminKey;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Request gagal');
  }

  return json;
}
