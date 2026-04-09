function doGet(e) {
  // Endpoint GET tetap didukung untuk health/debug ringan.
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  // Semua request utama dari Worker masuk lewat POST JSON.
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const request = method === 'GET' ? parseGetRequest_(e) : parseRequestBody_(e);
    const action = normalize_(request.action);
    if (!action) {
      throw new Error('action wajib diisi');
    }

    const spreadsheetId = normalize_(request.db_target_sheet_id);
    if (!spreadsheetId) {
      throw new Error('db_target_sheet_id wajib diisi dari Worker Secret');
    }

    const data = request.data || {};
    let result;

    switch (action) {
      case 'health':
        result = { service: 'taekwondo-gas', status: 'ok' };
        break;
      case 'loginAnggota':
        result = loginAnggota_(spreadsheetId, data);
        break;
      case 'loginAdmin':
        result = loginAdmin_(spreadsheetId, data);
        break;
      case 'getDashboardAnggota':
        result = getDashboardAnggota_(spreadsheetId, data);
        break;
      case 'getDashboardAdmin':
        // Semua operasi admin dilindungi internal key dari Worker.
        assertInternalAdminKey_(request.internal_api_key);
        result = getDashboardAdmin_(spreadsheetId);
        break;
      case 'saveAnggota':
        assertInternalAdminKey_(request.internal_api_key);
        result = saveAnggota_(spreadsheetId, data);
        break;
      case 'listAnggota':
        assertInternalAdminKey_(request.internal_api_key);
        result = listAnggota_(spreadsheetId);
        break;
      case 'updateSettingIuran':
        assertInternalAdminKey_(request.internal_api_key);
        result = updateSettingIuran_(spreadsheetId, data);
        break;
      case 'getSettingIuran':
        assertInternalAdminKey_(request.internal_api_key);
        result = getSettingIuran_(spreadsheetId);
        break;
      case 'saveIuranBulanan':
        assertInternalAdminKey_(request.internal_api_key);
        result = saveIuranBulanan_(spreadsheetId, data);
        break;
      case 'saveIuranKas':
        assertInternalAdminKey_(request.internal_api_key);
        result = saveIuranKas_(spreadsheetId, data);
        break;
      default:
        throw new Error('Action tidak dikenali: ' + action);
    }

    return jsonResponse_(true, 'OK', result);
  } catch (err) {
    return jsonResponse_(false, err.message, null);
  }
}

function parseGetRequest_(e) {
  const params = (e && e.parameter) || {};
  return {
    action: params.action || '',
    db_target_sheet_id: params.db_target_sheet_id || '',
    internal_api_key: params.internal_api_key || '',
    data: params,
  };
}
