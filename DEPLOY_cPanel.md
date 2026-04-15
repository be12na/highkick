# Deploy Guide - Highkick Taekwondo ke cPanel

## Prerequisites

1. Shared hosting dengan PHP 7.4+ dan MySQL 5.7+
2. cPanel akses dengan MySQL database
3. Domain/subdomain sudah dikonfigurasi

## Struktur Folder Proyecto

```
highkick-taekwondo/
├── api/
│   └── index.php          # PHP API endpoint
├── config/
│   ├── config.php        # Konfigurasi database
│   └── database.php      # Koneksi MySQL
├── web/
│   ├── css/style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── auth.js
│   │   └── anggota.js
│   ├── admin.html
│   ├── anggota.html
│   └── index.html
├── .htaccess             # Konfigurasi Apache
├── database.sql          # Schema & data awal
└── DEPLOY_cPanel.md     # Dokumentasi ini
```

## Langkah Deploy

### 1. Database Setup

1. Login ke phpMyAdmin di cPanel
2. Buat database baru: `highkick_db`
3. Buat user MySQL: `highkick_user` dengan password
4. Import file `database.sql` ke phpMyAdmin:
   - Buka phpMyAdmin
   - Pilih database `highkick_db`
   - Klik tab "Import"
   - Pilih file `database.sql`
   - Klik "Go"

### 2. Konfigurasi Database

Edit file `config/config.php`:
```php
<?php
return [
    'host' => 'localhost',
    'database' => 'highkick_db',
    'username' => 'highkick_user',
    'password' => 'password_anda',
    'charset' => 'utf8mb4',
    'internal_api_key' => 'hk_internal_key_2026',
];
```

### 3. Setup Password Admin (Opsional)

Update password admin di database:
```sql
UPDATE admin_user SET password_pin = 'password_baru' WHERE admin_id = 'adm_001';
```

### 4. Upload File

Upload semua file ke public_html atau document root:
```
public_html/
├── api/
├── config/
├── web/
├── .htaccess
├── database.sql
└── index.html (redirect)
```

### 5. Verifikasi Awal

Test akses health endpoint:
```bash
curl -X POST https://domain.com/api \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

Response yang diharapkan:
```json
{"success":true,"message":"OK","data":{"service":"highkick-php","status":"ok"}}
```

## Testing Checklist

### Pre-Flight Check
- [ ] Login ke phpMyAdmin berhasil
- [ ] Database `highkick_db` terbuat
- [ ] Tabel-tabel sudah ter-create (anggota, admin_user, dll)
- [ ] Data awal setting_iuran ada
- [ ] File config/config.php sudah dikonfigurasi

### Login Tests
- [ ] Login dengan nomor anggota yang benar -> berhasil
- [ ] Login dengan nomor anggota yang salah -> error "Nomor anggota tidak ditemukan"
- [ ] Login admin dengan email/password benar -> berhasil
- [ ] Login admin dengan email/password salah -> error "Login admin gagal"

### Dashboard Anggota
- [ ] Profil anggota muncul正确
- [ ] Riwayat iuran bulanan tampil
- [ ] Riwayat iuran kas tampil
- [ ] Ringkasan tagihan/bayar/tunggakan benar

### Dashboard Admin
- [ ] Total anggota terlihat
- [ ] Anggota aktif terhitung
- [ ] Anggota nonaktif terhitung  
- [ ] Tunggakan bulanan terkalkulasi
- [ ] Tunggakan kas terkalkulasi

### CRUD Tests
- [ ] Tambah anggota baru -> berhasil, muncul di tabel
- [ ] Update anggota -> data berubah
- [ ] Input iuran bulanan -> data masuk, status otomatis (Lunas/Cicil/Belum Bayar)
- [ ] Input iuran kas -> data masuk, status otomatis
- [ ] Tambah setting iuran -> nominal default diterapkan ke iuran baru
- [ ] Update setting iuran -> nominal baru diterapkan

### Logout Tests
- [ ] Logout anggota -> kembali ke halaman login
- [ ] Logout admin -> kembali ke halaman login

## Troubleshooting

### Error 500 - Internal Server Error
- Check PHP error log di cPanel (Error Logs)
- Pastikan file permission 644 untuk file PHP
- Pastikan folder permission 755
- Check apakah PDO MySQL extension enabled

### Database Connection Failed
- Verifikasi kredensial di config/config.php
- Pastikan database sudah di-import
- Cek privilege user MySQL ke database

### CORS Error
- Pastikan .htaccess sudah ter-upload
- Cek konfigurasi domain di cPanel tidak memblokir API

### 404 Not Found
- Pastikan mod_rewrite enabled di cPanel
- Cek .htaccess terdeteksi dengan benar

## Perbedaan dari Versi Lama

| Fitur | Sebelum | Sesudah |
|------|---------|--------|
| Backend | Cloudflare Workers + GAS | PHP Native |
| Database | Google Sheets | MySQL Lokal |
| Deployment | Wrangler CLI | cPanel Upload |
| API Key | Environment Secrets | File config.php |

## Keamanan

1. **config/database.php** dilindungi oleh .htaccess (tidak bisa diakses dari web)
2. Password tidak disimpan di kode (gunakan config.php)
3. Input divalidasi sebelum query
4. Prepared statements digunakan untuk mencegah SQL injection
5. Admin routes dilindungi oleh internal API key