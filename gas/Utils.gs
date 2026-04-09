function getSheet_(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tidak ditemukan: ' + sheetName);
  }
  return sheet;
}

function getAllObjects_(spreadsheetId, sheetName) {
  const sheet = getSheet_(spreadsheetId, sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return [];
  }

  const headers = data[0].map((h) => normalize_(h));
  const rows = [];

  for (let r = 1; r < data.length; r += 1) {
    const row = data[r];
    const obj = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c += 1) {
      obj[headers[c]] = row[c];
      if (row[c] !== '' && row[c] !== null) {
        hasValue = true;
      }
    }
    if (hasValue) {
      rows.push(obj);
    }
  }

  return rows;
}

function appendObject_(spreadsheetId, sheetName, payload) {
  const sheet = getSheet_(spreadsheetId, sheetName);
  const headers = getHeaders_(sheet);
  const row = headers.map((h) => {
    if (Object.prototype.hasOwnProperty.call(payload, h)) {
      return payload[h];
    }
    return '';
  });
  sheet.appendRow(row);
}

function upsertByField_(spreadsheetId, sheetName, fieldName, fieldValue, payload) {
  const sheet = getSheet_(spreadsheetId, sheetName);
  const headers = getHeaders_(sheet);
  const targetRow = findRowIndex_(sheet, fieldName, fieldValue);

  if (targetRow <= 0) {
    appendObject_(spreadsheetId, sheetName, payload);
    return payload;
  }

  const existing = readRowObject_(sheet, targetRow, headers);
  const merged = Object.assign({}, existing, payload);
  const values = headers.map((h) => (Object.prototype.hasOwnProperty.call(merged, h) ? merged[h] : ''));
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  return merged;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) {
    throw new Error('Header tidak ditemukan di sheet: ' + sheet.getName());
  }
  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((h) => normalize_(h));
}

function readRowObject_(sheet, rowIndex, headers) {
  const values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const obj = {};
  for (let i = 0; i < headers.length; i += 1) {
    obj[headers[i]] = values[i];
  }
  return obj;
}

function findRowIndex_(sheet, fieldName, expectedValue) {
  const headers = getHeaders_(sheet);
  const idx = headers.indexOf(normalize_(fieldName));
  if (idx === -1) {
    return -1;
  }

  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r += 1) {
    if (normalize_(values[r][idx]) === normalize_(expectedValue)) {
      return r + 1;
    }
  }
  return -1;
}

function jsonResponse_(success, message, data) {
  return ContentService
    .createTextOutput(
      JSON.stringify({
        success,
        message,
        data,
        timestamp: new Date().toISOString(),
      }),
    )
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Body JSON wajib diisi');
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('Body JSON tidak valid');
  }
}

function normalize_(val) {
  if (val === null || typeof val === 'undefined') {
    return '';
  }
  return String(val).trim();
}

function toNumber_(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function nowIso_() {
  return new Date().toISOString();
}

function generateId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return prefix + '_' + stamp + '_' + random;
}

function validatePeriod_(periode) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalize_(periode))) {
    throw new Error('periode wajib format YYYY-MM');
  }
}

function validateNominal_(value, fieldName) {
  if (value === null || typeof value === 'undefined' || value === '') {
    throw new Error(fieldName + ' wajib diisi');
  }
  if (toNumber_(value) < 0) {
    throw new Error(fieldName + ' tidak boleh negatif');
  }
}

function paymentStatus_(nominalTagihan, nominalBayar) {
  if (nominalBayar >= nominalTagihan) {
    return 'Lunas';
  }
  if (nominalBayar <= 0) {
    return 'Belum Bayar';
  }
  return 'Cicil';
}
