# Dokumentasi Teknis - Highkick Taekwondo Cloudflare Workers

## 1. Arsitektur Sistem

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Browser Client    │ ───► │  Cloudflare Worker  │ ───► │  Google Apps Script │
│   (web/ folder)     │      │   (worker/src)      │      │    (gas/ folder)    │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
        │                            │                            │
        │ POST /api/*                │ POST JSON                  │ SpreadsheetApp
        │ Origin: https://           │ internal_api_key           │ getAllObjects_
        │   highkick.zhost.digital   │ db_target_sheet_id         │ appendObject_
        └────────────────────────────┴────────────────────────────┘ upsertByField_
```

## 2. Runtime Compatibility - Cloudflare Workers

### 2.1 Fitur yang Digunakan (Kompatibel)
- **Fetch API**: `fetch()` untuk forwarding request ke GAS
- **Request/Response objects**: Standard Web API
- **Headers**: `request.headers.get()`, `response.headers.set()`
- **URL API**: `new URL()` untuk parsing pathname
- **JSON**: `JSON.parse()`, `JSON.stringify()`
- **Set**: `new Set()` untuk route mapping
- **Async/Await**: Full support
- **Environment Variables**: `env.SECRET_NAME`

### 2.2 API yang TIDAK Digunakan (aman)
- ❌ `node:*` modules (fs, path, crypto, etc.)
- ❌ `require()`, `module.exports` (CommonJS)
- ❌ `Buffer`, `process` (Node.js globals)
- ❌ `setTimeout`/`setInterval` (tidak diperlukan)
- ❌ WebSocket (tidak diperlukan)

### 2.3 Batasan Penting
- **Request size**: Max 100MB (Cloudflare Workers)
- **Response size**: Max 100MB
- **CPU time**: Max 10ms untuk free tier
- **Memory**: Max 128MB (lebih dari cukup untuk use case ini)

## 3. Endpoint API

### 3.1 Worker Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/health` | - | Health check |
| POST | `/api/login-anggota` | - | Login anggota |
| POST | `/api/login-admin` | - | Login admin |
| POST | `/api/dashboard-anggota` | - | Dashboard anggota |
| POST | `/api/dashboard-admin` | Header `x-admin-api-key` | Dashboard admin |
| POST | `/api/admin/anggota` | Header `x-admin-api-key` | CRUD anggota |
| POST | `/api/admin/iuran-bulanan` | Header `x-admin-api-key` | Input iuran bulanan |
| POST | `/api/admin/iuran-kas` | Header `x-admin-api-key` | Input iuran kas |
| POST | `/api/admin/setting-iuran` | Header `x-admin-api-key` | Setting iuran |

### 3.2 Request Format
```json
{
  "nomor_anggota": "TKD-001",
  "mode": "list",
  "nominal_bayar": 100000,
  "periode": "2026-04"
}
```

### 3.3 Response Format
```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "timestamp": "2026-04-12T10:00:00.000Z"
}
```

## 4. Keamanan

### 4.1 Origin Validation
Worker HANYA menerima request dari origin `https://highkick.zhost.digital`.

### 4.2 Admin Key Protection
- Semua route admin WAJIB menggunakan header `x-admin-api-key`
- Key divalidasi di Worker DAN di GAS
- secret: `INTERNAL_API_KEY`

### 4.3 Environment Secrets
```
GAS_WEB_APP_URL    → URL Google Apps Script deploy
DB_TARGET_SHEET_ID → Google Sheets ID (spreadsheet)
INTERNAL_API_KEY   → Secret key untuk proteksi admin
```

## 5. Dependencies

### 5.1 Worker Dependencies
```json
{
  "name": "taekwondo-worker",
  "version": "1.0.0",
  "private": true
}
```
**Tidak ada dependencies tambahan** - menggunakan native Cloudflare Workers runtime.

### 5.2 Google Apps Script Dependencies
- **SpreadsheetApp**: Akses Google Sheets
- **PropertiesService**: Simpan INTERNAL_API_KEY
- **Utilities**: Format tanggal, random ID
- **Session**: Get script timezone

## 6. Struktur Data Google Sheets

### 6.1 Sheet: `Anggota`
| Column | Type | Required |
|--------|------|----------|
| member_id | string | Auto |
| nomor_anggota | string | Yes |
| nama_lengkap | string | Yes |
| status_anggota | enum | Yes (Aktif/Nonaktif/Cuti) |
| dojo_cabang | string | No |
| tingkatan_sabuk | string | No |
| peringkat | string | No |
| tanggal_bergabung | date | No |

### 6.2 Sheet: `Iuran_Bulanan`
| Column | Type | Required |
|--------|------|----------|
| transaksi_id | string | Auto |
| nomor_anggota | string | Yes |
| periode | string | Yes (YYYY-MM) |
| nominal_tagihan | number | Auto |
| nominal_bayar | number | Yes |
| status_pembayaran | enum | Auto (Lunas/Belum Bayar/Cicil) |

### 6.3 Sheet: `Iuran_Kas`
Mirror struktur `Iuran_Bulanan` dengan `kas_id`.

### 6.4 Sheet: `Setting_Iuran`
| Column | Type | Required |
|--------|------|----------|
| setting_id | string | Auto |
| nama_iuran | string | Yes |
| tipe_iuran | string | Yes (bulanan/kas) |
| nominal_default | number | Yes |
| aktif | boolean | Yes |
| mulai_berlaku | string | No (YYYY-MM) |

### 6.5 Sheet: `Admin_User`
| Column | Type | Required |
|--------|------|----------|
| admin_id | string | Auto |
| nama_admin | string | Yes |
| email_admin | string | Yes |
| password_pin | string | Yes |
| role | string | No |
| status_aktif | boolean | Yes |

## 7. Deployment Steps

### 7.1 Prerequisites
- Cloudflare account
- Google account (untuk Sheets + Apps Script)
- Node.js + npm (untuk Wrangler)

### 7.2 Setup Google Sheets
1. Buat Google Sheets baru
2. Rename menjadi `DB_Taekwondo_Management`
3. Buat sheet sesuai struktur di atas
4. Copy Sheet ID dari URL (format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`)

### 7.3 Setup Google Apps Script
1. Buka Sheets → Extensions → Apps Script
2. Buat project baru
3. Buat file di folder `gas/`:
   - `Code.gs`
   - `Config.gs`
   - `Utils.gs`
   - `Auth.gs`
   - `Anggota.gs`
   - `IuranBulanan.gs`
   - `IuranKas.gs`
   - `Dashboard.gs`
4. Project Settings → Script Properties → Add Property:
   - `INTERNAL_API_KEY`: Generate random string (contoh: `hk_2026_x7k9m2p`)
5. Deploy → New Deployment:
   - Select type: Web app
   - Execute as: Me
   - Who has access: Anyone
6. Copy URL hasil deploy

### 7.4 Setup Cloudflare Worker
1. Install Wrangler: `npm install -g wrangler`
2. Clone repo ini
3. Copy `.dev.vars.example` → `.dev.vars`
4. Edit `.dev.vars`:
   ```
   GAS_WEB_APP_URL="https://script.google.com/macros/s/XXX/exec"
   DB_TARGET_SHEET_ID="SHEET_ID_ANDA"
   INTERNAL_API_KEY="hk_2026_x7k9m2p"
   ```
5. Test local: `wrangler dev`
6. Deploy production:
   ```bash
   wrangler secret put GAS_WEB_APP_URL
   wrangler secret put DB_TARGET_SHEET_ID
   wrangler secret put INTERNAL_API_KEY
   wrangler deploy
   ```

### 7.5 Setup Custom Domain
1. Buka Cloudflare Dashboard
2. Pergi ke Workers → your worker → Triggers
3. Add custom domain: `highkick.zhost.digital`
4. Pastikan DNS sudah terpointing ke Cloudflare

### 7.6 Deploy Frontend
1. Serve folder `web/` di domain yang sama
2. Jika menggunakan Workers Sites:
   ```bash
   wrangler sites bucket ./web
   wrangler deploy
   ```
3. Atau gunakan Cloudflare Pages dengan binding ke worker

## 8. Error Handling

### 8.1 Worker Error Levels
| HTTP Code | Kondisi |
|-----------|---------|
| 403 | Origin tidak diizinkan |
| 400 | Request body invalid / Error dari GAS |
| 404 | Route tidak ditemukan |
| 405 | Method tidak diizinkan |
| 502 | GAS response invalid |

### 8.2 Error Response Format
```json
{
  "success": false,
  "message": "Pesan error spesifik",
  "data": null,
  "timestamp": "2026-04-12T10:00:00.000Z"
}
```

## 9. Testing

### 9.1 Health Check
```bash
curl -X POST https://highkick.zhost.digital/health \
  -H "Origin: https://highkick.zhost.digital" \
  -H "Content-Type: application/json"
```

### 9.2 Login Anggota
```bash
curl -X POST https://highkick.zhost.digital/api/login-anggota \
  -H "Origin: https://highkick.zhost.digital" \
  -H "Content-Type: application/json" \
  -d '{"nomor_anggota": "TKD-001"}'
```

### 9.3 Login Admin (with key)
```bash
curl -X POST https://highkick.zhost.digital/api/login-admin \
  -H "Origin: https://highkick.zhost.digital" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: hk_2026_x7k9m2p" \
  -d '{"email_admin": "admin@dojo.com", "password_pin": "1234"}'
```

## 10. Troubleshooting

### 10.1 Common Issues
| Issue | Solution |
|-------|----------|
| 403 Origin Error | Pastikan Origin header sesuai dengan `ALLOWED_ORIGIN` |
| 400 Error "Secret belum diset" | Jalankan `wrangler secret put <SECRET>` |
| 502 GAS Response Invalid | Cek GAS deploy URL dan pastikan deploy "Anyone" |
| CORS Issues | Pastikan Worker menambahkan CORS headers |

### 10.2 Logging
```javascript
// Di worker untuk debugging
console.log('Request:', request.url);
console.log('Env:', env);
```
Cek logs dengan: `wrangler tail`

## 11. Monitoring

### 11.1 Metrics yang Perlu Dipantau
- Request count per endpoint
- Error rate (4xx, 5xx)
- Response time (P95, P99)
- GAS latency

### 11.2 Cloudflare Analytics
- Workers → your worker → Analytics
- Metrics tersedia di Cloudflare Dashboard

## 12. Kesimpulan

Aplikasi ini adalah full-stack serverless:
- **Frontend**: Static HTML/CSS/JS
- **Middleware**: Cloudflare Workers (proxy + security)
- **Backend**: Google Apps Script (business logic)
- **Database**: Google Sheets

Semua komponen kompatibel dengan runtime masing-masing dan siap untuk production deployment di Cloudflare Workers.
