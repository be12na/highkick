# Taekwondo Management App (MVP)

Project web app sederhana dan ramah pemula dengan stack:

- Google Sheets (database)
- Google Apps Script (backend API)
- Cloudflare Worker (middleware publik)
- HTML/CSS/JavaScript vanilla (UI)

## Struktur Folder

```bash
taekwondo-management-app/
├── README.md
├── .gitignore
├── .dev.vars.example
├── wrangler.toml
├── worker/
│   ├── src/index.js
│   └── package.json
├── gas/
│   ├── appsscript.json
│   ├── Code.gs
│   ├── Config.gs
│   ├── Utils.gs
│   ├── Auth.gs
│   ├── Anggota.gs
│   ├── IuranBulanan.gs
│   ├── IuranKas.gs
│   └── Dashboard.gs
├── web/
│   ├── index.html
│   ├── admin.html
│   ├── anggota.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── auth.js
│       ├── admin.js
│       └── anggota.js
└── docs/
    ├── API_CONTRACT.md
    ├── SHEET_MAPPING.md
    └── DEPLOYMENT_STEPS.md
```

## Fitur MVP

- Login anggota (nomor anggota)
- Dashboard anggota (profil + status iuran)
- Login admin
- CRUD anggota
- Setting iuran bulanan/kas
- Input pembayaran iuran bulanan/kas
- Dashboard admin ringkas

## Dokumen penting

- `docs/API_CONTRACT.md`
- `docs/SHEET_MAPPING.md`
- `docs/DEPLOYMENT_STEPS.md`
