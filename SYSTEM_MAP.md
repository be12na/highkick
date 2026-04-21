# Project Summary
- **Tujuan aplikasi**: Sistem informasi manajemen "Highkick Taekwondo Jogja" untuk memfasilitasi admin (mengelola data anggota & tagihan iuran) serta anggota (melihat rekap personal, history pembayaran, dan iuran tertunggak).
- **Tech stack utama**: PHP (Core API), MySQL (Database), Vanilla JS (Client SPA), Vanilla CSS (UI styles), Chart.js (Visualisasi via CDN), PWA (Service Workers, Manifest).
- **Pola arsitektur**: Monolithic Client-Server (SPA Backend API). Frontend adalah Single Page Application (html/css/js statis) yang berkomunikasi sepenuhnya via AJAX (`fetch`) ke satu entrypoint backend (`api/index.php`) yang memproses logika bisnis dan koneksi database. URL dikelola bersih melalui `.htaccess`.

# Core Logic Flow (Function-Level Flowchart)
- **Auth Anggota**: Route `/` -> JS `auth.js` (Form) -> API `loginAnggota` -> DB `SELECT anggota` (Cek status) -> JWT/Token -> Redirect -> Route `/anggota`
- **Auth Admin**: Route `/` -> JS `auth.js` (Form) -> API `loginAdmin` -> DB `SELECT admin_user` (Verify password bcrypt) -> Update Token -> Redirect -> Route `/admin`
- **Load Admin Dashboard (Data & KPI)**: Route `/admin` -> JS `admin.js`(`refreshDashboard`) -> API `getDashboardAdmin` -> DB `SELECT summary iuran & status` -> API JSON -> JS `renderCharts() + renderSummary()`
- **Manajemen Anggota (List/Edit)**: Route `/admin#section-anggota` -> JS `admin.js`(`submitAdminForm`/ajax) -> API `listAnggota`/`saveAnggota` -> DB `SELECT/INSERT/UPDATE anggota`
- **Input Iuran (Bulanan/Kas)**: Route `/admin#section-operations` -> JS `admin.js` -> API `saveIuranBulanan` / `saveIuranKas` -> DB `INSERT iuran` -> UI Sync

# Clean Tree

```
/
├── api/
│   └── index.php
├── config/
│   ├── config.php
│   └── database.php
├── web/
│   ├── assets/
│   ├── css/
│   │   ├── admin.css
│   │   ├── login.css
│   │   └── style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── anggota.js
│   │   ├── api.js
│   │   └── auth.js
│   ├── admin.html
│   ├── anggota.html
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
├── database.sql
├── index.php
└── .htaccess
```

# Module Map (The Chapters)

- **`api/index.php`**: Entrypoint tunggal Backend. Berisi routing controller (switch case), function otentikasi (`loginAdmin`, `loginAnggota`), dan seluruh service/query database CRUD (`saveAnggota`, `getDashboardAdmin`, dll).
- **`config/database.php`**: Singleton Wrapper ekstensi PDO (PHP Data Objects) untuk mengeksekusi koneksi ke MySQL base on konfigurasi DB.
- **`config/config.php`**: Mendefinisikan credential dan environment variables terkait database.
- **`web/index.html`**: Tampilan UI untuk gateway login awal (Login Tab: Admin / Anggota).
- **`web/admin.html`**: Halaman SPA utama panel Dashboard Admin. Menampilkan layout sidebar, KPI metrik statik, Chart.js, dan Form Tab Manajemen anggota/iuran.
- **`web/anggota.html`**: Halaman SPA bagi End User (peserta) untuk mengecek profil dan tagihan iurannya sendiri.
- **`web/js/api.js`**: Core Client Utility. Menyediakan fungsi uniform `postApi` untuk membungkus `fetch()` dengan penanganan error seragam dan injeksi kredensial.
- **`web/js/auth.js`**: Logika UI client side pada `index.html`. Handle Toggle Tab Login Anggota vs Admin dan simpan token di IndexedDB/LocalStorage pasca response masuk.
- **`web/js/admin.js`**: Orchestrator UI untuk halaman Admin. Mengatur logika load list AJAX polling secara paralel, event click navigasi sidebar switch, merender template data JSON ke tabel/Chart.js DOM.
- **`web/js/anggota.js`**: Orchestrator UI untuk halaman Anggota. Serupa admin.js, namun spesifik sinkronisasi state profil pribadi dan tabel kas/tagihannya.
- **`web/css/style.css`**: Basis sistem UI/UX core desain dan modern fluid typography, color root CSS variables.
- **`web/sw.js` & `web/manifest.json`**: Implementasi fungsional PWA (Service Workers cache controller dan info app icon/standalone mobile manifest).

# Data & Config
- **Lokasi Config**: `config/config.php`
- **Lokasi Skema/Seed**: `database.sql`
- **Output Artifacts Runtime**: Tidak ada (Client browser render realtime dari JSON API. Tidak ada sistem Build Tool eksternal).
- **Skema Ringkas**:
    1. `anggota`: Tabel sentral (member_id, nomor_anggota, status dll)
    2. `admin_user`: Tabel pengelola (admin_id, password_pin bcrypt hash, token)
    3. `setting_iuran`: Setup Nominal & Aktivasi tipe pembayaran 
    4. `iuran_bulanan` & `iuran_kas`: Detail Transaksi / History iuran masing-masing nomor_anggota.

# External Integrations
- Chart.js (UI Graphic Analytics Dashboard via script CDN di admin.html).

# Risks / Blind Spots
- Monolithic Backend di satu file (`api/index.php`) memiliki sekitar 600+ baris dan memuat seluruh routing, service, hingga inline query SQL secara direct. Seiring berkembangnya proyek akan susah dirawat.
- Pengelolaan Session terbatas. Mekanisme token disimpan di lokal web storage frontend yang tidak dapat kadaluwarsa sendiri secara ketat melalui backend PHP core (tidak ditemukan implementasi expired state/jwt base di `api/index.php`). Murni mengandalkan pengecekan `session_token` table string match.
