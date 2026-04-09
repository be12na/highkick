# Deployment Steps (Pemula Friendly)

## 1) Siapkan Google Sheets

1. Import file Excel template ke Google Sheets.
2. Ubah nama file jadi `DB_Taekwondo_Management`.
3. Pastikan semua sheet dan kolom mengikuti `docs/SHEET_MAPPING.md`.

## 2) Setup Google Apps Script

1. Buka Google Sheets → Extensions → Apps Script.
2. Buat file sesuai folder `gas/`:
   - `Code.gs`, `Config.gs`, `Utils.gs`, `Auth.gs`, `Anggota.gs`, `IuranBulanan.gs`, `IuranKas.gs`, `Dashboard.gs`.
3. Copy isi file dari project ini ke Apps Script.
4. Buka Project Settings → Script Properties, lalu isi:
   - `INTERNAL_API_KEY` = sama dengan secret worker `INTERNAL_API_KEY`
5. Deploy sebagai **Web App**:
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Copy URL hasil deploy (ini nilai `GAS_WEB_APP_URL`).

## 3) Setup Cloudflare Worker

1. Dari root project jalankan `npm create cloudflare@latest` jika belum install Wrangler.
2. Pastikan file root `wrangler.toml` sudah ada.
3. Salin `.dev.vars.example` menjadi `.dev.vars` untuk local.
4. Isi `.dev.vars`:
   - `GAS_WEB_APP_URL`
   - `DB_TARGET_SHEET_ID`
   - `INTERNAL_API_KEY`
5. Jalankan local:
   - `wrangler dev`
6. Set secret production:
   - `wrangler secret put GAS_WEB_APP_URL`
   - `wrangler secret put DB_TARGET_SHEET_ID`
   - `wrangler secret put INTERNAL_API_KEY`
7. Deploy:
   - `wrangler deploy`

## 4) Jalankan UI sederhana

1. Serve folder `web/` dengan static server sederhana (misalnya extension Live Server).
2. Buka `web/index.html`.
3. Test urut:
   - login anggota
   - dashboard anggota
   - login admin
   - save anggota
   - save setting iuran
   - save iuran bulanan/kas
   - dashboard admin

## 5) Catatan penting

- Jangan commit `.dev.vars`.
- Simpan key hanya di secret/env.
- Project ini sengaja sederhana dan tidak pakai framework berat.
- Struktur root sederhana agar menghindari masalah deploy submodule saat Cloudflare build.
