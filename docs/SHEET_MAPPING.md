# Sheet Mapping

File Google Sheets: `DB_Taekwondo_Management`

## 1) Sheet `Anggota`

- member_id
- nomor_anggota
- nama_lengkap
- jenis_kelamin
- tanggal_lahir
- no_hp
- alamat
- dojo_cabang
- tingkatan_sabuk
- peringkat
- tanggal_bergabung
- status_anggota
- foto_url
- catatan

## 2) Sheet `Setting_Iuran`

- setting_id
- nama_iuran
- tipe_iuran
- nominal_default
- aktif
- mulai_berlaku
- catatan

## 3) Sheet `Iuran_Bulanan`

- transaksi_id
- nomor_anggota
- periode
- nominal_tagihan
- nominal_bayar
- tanggal_bayar
- metode_bayar
- status_pembayaran
- catatan

## 4) Sheet `Iuran_Kas`

- kas_id
- nomor_anggota
- periode
- nominal_tagihan
- nominal_bayar
- tanggal_bayar
- status_pembayaran
- catatan

## 5) Sheet `Admin_User`

- admin_id
- nama_admin
- email_admin
- password_pin
- role
- status_aktif

## 6) Sheet `Dashboard_Ringkas`

Opsional untuk cache ringkasan, tidak wajib pada MVP.

## Relasi sederhana

- `Anggota.nomor_anggota` → `Iuran_Bulanan.nomor_anggota`
- `Anggota.nomor_anggota` → `Iuran_Kas.nomor_anggota`
