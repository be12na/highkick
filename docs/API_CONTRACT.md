# API Contract (Frontend → Worker → GAS)

Semua endpoint menggunakan method `POST` dan JSON.

Base URL contoh:
`https://taekwondo-management-worker.workers.dev`

## Bentuk response konsisten

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "timestamp": "2026-04-09T10:00:00.000Z"
}
```

## Header penting

- `Content-Type: application/json`
- Untuk route admin: `x-admin-token: <SESSION_TOKEN_DARI_LOGIN>`

## Endpoint Frontend → Worker

### 1) Login Anggota
`POST /api/login-anggota`

Request:
```json
{ "nomor_anggota": "TKD-001" }
```

### 2) Login Admin
`POST /api/login-admin`

Request:
```json
{
  "email_admin": "admin@dojo.com",
  "password_pin": "1234"
}
```

### 3) Dashboard Anggota
`POST /api/dashboard-anggota`

Request:
```json
{ "nomor_anggota": "TKD-001" }
```

### 4) Dashboard Admin
`POST /api/dashboard-admin`

Request:
```json
{}
```

### 5) Save / List Anggota (Admin)
`POST /api/admin/anggota`

List data:
```json
{ "mode": "list" }
```

Save/update data:
```json
{
  "member_id": "",
  "nomor_anggota": "TKD-002",
  "nama_lengkap": "Ahmad Fauzi",
  "status_anggota": "Aktif"
}
```

### 6) Save Iuran Bulanan (Admin)
`POST /api/admin/iuran-bulanan`

```json
{
  "nomor_anggota": "TKD-001",
  "periode": "2026-04",
  "nominal_bayar": 100000,
  "metode_bayar": "Transfer"
}
```

### 7) Save Iuran Kas (Admin)
`POST /api/admin/iuran-kas`

```json
{
  "nomor_anggota": "TKD-001",
  "periode": "2026-04",
  "nominal_bayar": 50000
}
```

### 8) Update / List Setting Iuran (Admin)
`POST /api/admin/setting-iuran`

List:
```json
{ "mode": "list" }
```

Update/save:
```json
{
  "nama_iuran": "Iuran Bulanan Reguler",
  "tipe_iuran": "bulanan",
  "nominal_default": 150000,
  "aktif": true,
  "mulai_berlaku": "2026-04"
}
```

## Action Worker → GAS

- `loginAnggota`
- `loginAdmin`
- `getDashboardAnggota`
- `getDashboardAdmin`
- `saveAnggota`
- `listAnggota`
- `saveIuranBulanan`
- `saveIuranKas`
- `updateSettingIuran`
- `getSettingIuran`

## Aturan validasi inti

- `nomor_anggota` unik
- `nama_lengkap` wajib isi
- nominal harus angka non-negatif
- `periode` harus format `YYYY-MM`
- `status_anggota` hanya `Aktif`, `Nonaktif`, `Cuti`
- status pembayaran otomatis:
  - `Lunas` jika `nominal_bayar >= nominal_tagihan`
  - `Belum Bayar` jika `nominal_bayar <= 0`
  - `Cicil` untuk selain itu
