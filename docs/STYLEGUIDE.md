# Highkick Taekwondo Style Guide

Panduan gaya desain (style-guide) ringkas ini mendokumentasikan pola UI, layout kelas, dan palet warna agar dapat dipertahankan di seluruh aplikasi.

## Warna Tema
Root colors (`admin.css` & `style.css`):
- **Background Utama**: `--admin-bg` `#08111f`, `--bg` `#f8fafc`
- **Surface/Card**: `--admin-surface` `rgba(8, 17, 31, 0.86)`, `--card` `#ffffff`
- **Primary (Biru)**: `--admin-primary` `#2563eb` Utama interaktif.
- **Success (Hijau)**: `--admin-success` `#059669` Validasi / konfirmasi.
- **Danger (Merah)**: `--admin-danger` `#dc2626` Hapus, error.
- **Warning (Kuning)**: `--admin-accent` `#f59e0b` Cuti, delay.

## Tipografi
Semua elemen font menggunakan: `Inter` dengan scaling responsif melalui CSS `clamp()`.

## CSS Komponen & Utilitas

### Layouting & Grid
- `.admin-shell`: Sidebar dan main area dengan layout `grid`.
- `.admin-form-grid`: Grid 2 kolom dengan jarak space-4.
- `.admin-kpi-grid` / `.admin-kpi-grid--3`: Standar dashboard bar untuk card summary (2 dan 3 grid responsif).
- `.admin-overview-grid`: Layout khusus untuk gabungan status dan chart berdampingan.

### Margin Utilities
Cegah menggunakan internal element `style="margin-top: x"`. Gunakan:
- `.margin-top-4`: Margin tas sebesar ukuran blok `--admin-space-4` (20px).
- `.margin-bottom-4`: Margin bawah `--admin-space-4`.

### Button System
- `.btn`: Tombol utama berwarna dasar biru primary.
- `.btn-secondary`: Tombol alternatif berwarna perak gelap.
- `.btn-success`: Tombol persetujuan (contoh: simpan profil, ganti password tersukses).
Semua tombol otomatis menerapkan class `:disabled`, `:hover`, & `:focus-visible` untuk aksesibilitas WCAG 2.1.

### Layout Data List (Profile)
Jangan menggunakan `<p>` tag berulang secara manual untuk property value. Menggunakan block:
```html
<div class="admin-profile-list">
  <div class="admin-profile-list__item">
    <span>Nama Label:</span>
    <span class="admin-profile-list__value">Nilai Content</span>
  </div>
</div>
```

Catatan: Update dan pertahankan kelas-kelas di atas sebagai sumber terpusat untuk segala perubahan CSS/UI.
