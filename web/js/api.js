/**
 * Tujuan: client HTTP utama untuk UI web agar semua request API memberi error yang konsisten.
 * Dipakai oleh: web/js/auth.js, web/js/admin.js, web/js/anggota.js.
 * Dependensi utama: Fetch API browser, localStorage untuk x-admin-api-key.
 * Fungsi public/utama: postApi(path, payload, withAdminKey).
 * Side effect penting: HTTP POST ke route /api/* dan membaca localStorage.
 */
async function postApi(path, payload, withAdminKey = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (withAdminKey) {
        const adminToken = localStorage.getItem('admin_token') || '';
        headers['x-admin-token'] = adminToken;
    }

    const baseUrl = '';
    const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
    });

    const json = await parseApiResponse_(res);
    if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Request gagal');
    }

    return json;
}

async function parseApiResponse_(res) {
    const rawText = await res.text();

    if (!rawText.trim()) {
        if (!res.ok) {
            throw new Error(`Server mengembalikan response kosong (HTTP ${res.status})`);
        }
        throw new Error('Response server kosong');
    }

    try {
        return JSON.parse(rawText);
    } catch {
        if (!res.ok) {
            throw new Error(`Server mengembalikan response non-JSON (HTTP ${res.status})`);
        }
        throw new Error('Response server bukan JSON yang valid');
    }
}
