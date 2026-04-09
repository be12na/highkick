const ALLOWED_ORIGIN = 'https://highkick.zhost.digital';

const ADMIN_ROUTES = new Set([
  '/api/dashboard-admin',
  '/api/admin/anggota',
  '/api/admin/iuran-bulanan',
  '/api/admin/iuran-kas',
  '/api/admin/setting-iuran',
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    validateOrigin_(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders_(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse(false, 'Method tidak diizinkan', null, 405, origin);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/health') {
        return jsonResponse(true, 'Worker aktif', { service: 'highkick' }, 200, origin);
      }

      if (path === '/api/login-anggota') {
        return handleProxy(request, env, 'loginAnggota');
      }

      if (path === '/api/login-admin') {
        return handleProxy(request, env, 'loginAdmin');
      }

      if (path === '/api/dashboard-anggota') {
        return handleProxy(request, env, 'getDashboardAnggota');
      }

      if (path === '/api/dashboard-admin') {
        return handleProxy(request, env, 'getDashboardAdmin', { requireAdminKey: true });
      }

      if (path === '/api/admin/anggota') {
        return handleProxy(request, env, 'saveAnggota', { requireAdminKey: true });
      }

      if (path === '/api/admin/iuran-bulanan') {
        return handleProxy(request, env, 'saveIuranBulanan', { requireAdminKey: true });
      }

      if (path === '/api/admin/iuran-kas') {
        return handleProxy(request, env, 'saveIuranKas', { requireAdminKey: true });
      }

      if (path === '/api/admin/setting-iuran') {
        return handleProxy(request, env, 'updateSettingIuran', { requireAdminKey: true });
      }

      return jsonResponse(false, 'Route tidak ditemukan', null, 404, origin);
    } catch (error) {
      return jsonResponse(false, error.message || 'Terjadi error pada worker', null, 400, request.headers.get('Origin') || '');
    }
  },
};

async function handleProxy(request, env, action, options = {}) {
  validateEnvironment_(env);

  const path = new URL(request.url).pathname;
  const body = await readJson_(request);

  if (options.requireAdminKey || ADMIN_ROUTES.has(path)) {
    // Proteksi sederhana route admin memakai internal API key.
    validateAdminKey_(request, env);
  }

  const payload = {
    action,
    data: body,
    db_target_sheet_id: env.DB_TARGET_SHEET_ID,
    internal_api_key: env.INTERNAL_API_KEY,
  };

  const response = await fetch(env.GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonResponse(false, 'Response GAS tidak valid', { raw: text }, 502, request.headers.get('Origin') || '');
  }

  const statusCode = parsed.success === false ? 400 : 200;
  return new Response(JSON.stringify(parsed), {
    status: statusCode,
    headers: {
      ...corsHeaders_(request.headers.get('Origin') || ''),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function validateOrigin_(origin) {
  if (!origin) {
    return;
  }
  if (origin !== ALLOWED_ORIGIN) {
    throw new Error('Origin tidak diizinkan');
  }
}

function corsHeaders_(origin) {
  const allowOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-admin-api-key',
    Vary: 'Origin',
  };
}

function validateEnvironment_(env) {
  if (!env.GAS_WEB_APP_URL) {
    throw new Error('Secret GAS_WEB_APP_URL belum diset');
  }
  if (!env.DB_TARGET_SHEET_ID) {
    throw new Error('Secret DB_TARGET_SHEET_ID belum diset');
  }
  if (!env.INTERNAL_API_KEY) {
    throw new Error('Secret INTERNAL_API_KEY belum diset');
  }
}

function validateAdminKey_(request, env) {
  const key = request.headers.get('x-admin-api-key') || '';
  if (!key || key !== env.INTERNAL_API_KEY) {
    throw new Error('Akses admin ditolak. x-admin-api-key tidak valid');
  }
}

async function readJson_(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('application/json')) {
    throw new Error('Content-Type harus application/json');
  }
  return request.json();
}

function jsonResponse(success, message, data, status = 200, origin = '') {
  return new Response(
    JSON.stringify({
      success,
      message,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        ...corsHeaders_(origin),
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
}
