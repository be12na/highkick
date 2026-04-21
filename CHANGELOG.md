# CHANGELOG

Semua perubahan yang signifikan pada proyek ini akan didokumentasikan dalam file ini.

## [Unreleased] - 2026-04-21

### Changed (UI/UX Refactoring & Clean-up)
- **Dashboard Admin (`admin.html`)**:
  - Merefaktor tata letak bagian Ikhtisar menggabungkan KPI (Total Anggota, Anggota Aktif) dengan Bagan (Status Keanggotaan) yang tersisa menjadi satu komponen grid dua kolom (`.admin-overview-grid`).
  - Menghapus komponen/entitas Visualisasi (Eksposur Keuangan dan Sebaran Dojo) yang digabungkan yang sudah bukan preferensi lagi.
  - Membuang penggunaan style inline dan menggantinya dengan kelas utilitas terpusat.
- **Dashboard Anggota (`anggota.html`)**:
  - Mengubah layout profil untuk menggunakan `admin-profile-list` yang lebih modular alih-alih `style` inline (`margin`, `color`, `grid-template-columns`).
  - Merapikan margin KPI dan header menggunakan variasi `.margin-top-4` dan `.margin-bottom-4`.
- **Style CSS Dasar (`style.css` & `admin.css`)**:
  - Menambah state respon `:disabled` pada `.btn`, `input`, dan `select` untuk kepatuhan visual/aksesibilitas UX yang merata di `.admin-page`.
  - Merapikan struktur kolom toolbar dan flexbox.
  - Menambah dan mendokumentasikan `.admin-profile-list`, utilitas margin (`.margin-top-*`), dan style kartu `.flaz-card-blue` ke `.btn-success`.
  - Membersihkan grid yang usang (dari grid 4 kolom menjadi 2 sesuai sisa kartu KPI, `admin-kpi-grid--3` baru untuk fitur anggota).

### Fixed
- Menyelaraskan ukuran margin dan padding (grid gap `--admin-space-*`) antar komponen untuk menghindari penumpukan (overlap).
- Mengubah warna tombol Submit (Ganti Password) di `admin.html` dari inline-style menjadi kelas `btn-success`.
