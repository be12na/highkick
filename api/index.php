<?php
/**
 * Tujuan file/module: Menjadi entrypoint API PHP untuk login, dashboard, dan operasi admin aplikasi Highkick.
 * Pemakai oleh siapa: Browser frontend (`/web/js/*.js`), rewrite `/api/*` dari Apache/cPanel, dan health check deploy.
 * Dependensi utama: `config/database.php`, PDO MySQL, tabel `anggota`, `admin_user`, `setting_iuran`, `iuran_bulanan`, `iuran_kas`.
 * Daftar fungsi public/utama: routing action API, `loginAnggota`, `loginAdmin`, `getDashboardAnggota`, `getDashboardAdmin`, CRUD data inti.
 * Side effect penting: membaca body JSON request, query/ubah database MySQL, validasi header admin key, menulis file cache rate-limit.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    db()->execute("ALTER TABLE admin_user ADD COLUMN session_token VARCHAR(255) NULL");
} catch (\Throwable $e) {
    // Ignore if column already exists or altering fails
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan', null, 405);
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') === false) {
    jsonResponse(false, 'Content-Type harus application/json', null, 400);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse(false, 'Body JSON tidak valid', null, 400);
}

$path = $_SERVER['REQUEST_URI'] ?? '';
$action = normalize($input['action'] ?? '');
if (!$action) {
    if (strpos($path, 'login-anggota') !== false) {
        $action = 'loginAnggota';
    } elseif (strpos($path, 'login-admin') !== false) {
        $action = 'loginAdmin';
    } elseif (strpos($path, 'dashboard-anggota') !== false) {
        $action = 'getDashboardAnggota';
    } elseif (strpos($path, 'dashboard-admin') !== false) {
        $action = 'getDashboardAdmin';
    } elseif (strpos($path, 'admin/anggota') !== false) {
        $action = isset($input['mode']) && $input['mode'] === 'list' ? 'listAnggota' : 'saveAnggota';
    } elseif (strpos($path, 'admin/iuran-bulanan') !== false) {
        $action = 'saveIuranBulanan';
    } elseif (strpos($path, 'admin/iuran-kas') !== false) {
        $action = 'saveIuranKas';
    } elseif (strpos($path, 'admin/setting-iuran') !== false) {
        $action = isset($input['mode']) && $input['mode'] === 'list' ? 'getSettingIuran' : 'updateSettingIuran';
    } elseif (strpos($path, 'admin/profile') !== false) {
        $action = 'updateAdminProfile';
    } elseif (strpos($path, 'admin/password') !== false) {
        $action = 'updateAdminPassword';
    } elseif (strpos($path, 'health') !== false) {
        $action = 'health';
    }
}

if (!$action) {
    jsonResponse(false, 'action wajib diisi', null, 400);
}

try {
    $result = null;
    $data = isset($input['data']) && is_array($input['data']) ? $input['data'] : $input;

    switch ($action) {
        case 'health':
            $result = ['service' => 'highkick-php', 'status' => 'ok'];
            break;
        case 'loginAnggota':
            $result = loginAnggota($data);
            break;
        case 'loginAdmin':
            $result = loginAdmin($data);
            break;
        case 'getDashboardAnggota':
            $result = getDashboardAnggota($data);
            break;
        case 'getDashboardAdmin':
            validateAdminToken(resolveAdminToken($input));
            $result = getDashboardAdmin();
            break;
        case 'saveAnggota':
            validateAdminToken(resolveAdminToken($input));
            $result = saveAnggota($data);
            break;
        case 'listAnggota':
            validateAdminToken(resolveAdminToken($input));
            $result = listAnggota($data);
            break;
        case 'updateSettingIuran':
            validateAdminToken(resolveAdminToken($input));
            $result = updateSettingIuran($data);
            break;
        case 'getSettingIuran':
            validateAdminToken(resolveAdminToken($input));
            $result = getSettingIuran();
            break;
        case 'saveIuranBulanan':
            validateAdminToken(resolveAdminToken($input));
            $result = saveIuranBulanan($data);
            break;
        case 'saveIuranKas':
            validateAdminToken(resolveAdminToken($input));
            $result = saveIuranKas($data);
            break;
        case 'updateAdminProfile':
            validateAdminToken(resolveAdminToken($input));
            $result = updateAdminProfile($data, resolveAdminToken($input));
            break;
        case 'updateAdminPassword':
            validateAdminToken(resolveAdminToken($input));
            $result = updateAdminPassword($data, resolveAdminToken($input));
            break;
        default:
            throw new Exception('Action tidak dikenali: ' . $action);
    }

    jsonResponse(true, 'OK', $result);
} catch (Exception $e) {
    jsonResponse(false, $e->getMessage(), null, 400);
}

function jsonResponse($success, $message, $data = null, $status = 200) {
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('c'),
    ]);
    exit;
}

function normalize($val) {
    return is_string($val) ? trim($val) : ($val ?? '');
}

function toNumber($val) {
    $num = is_numeric($val) ? floatval($val) : 0;
    return is_finite($num) ? $num : 0;
}

function nowIso() {
    return date('c');
}

function generateId($prefix) {
    return $prefix . '_' . date('YmdHis') . '_' . rand(1000, 9999);
}

function validatePeriod($periode) {
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', normalize($periode))) {
        throw new Exception('periode wajib format YYYY-MM');
    }
}

function validateNominal($value, $fieldName) {
    if ($value === null || $value === '' || $value === false) {
        throw new Exception($fieldName . ' wajib diisi');
    }
    if (toNumber($value) < 0) {
        throw new Exception($fieldName . ' tidak boleh negatif');
    }
}

function validateAdminToken($providedToken) {
    if (!$providedToken) {
        throw new Exception('Akses ditolak. Token tidak ditemukan.');
    }
    $row = db()->fetchOne("SELECT admin_id FROM admin_user WHERE session_token = ? AND status_aktif != 'false'", [normalize($providedToken)]);
    if (!$row) {
        throw new Exception('Sesi admin tidak valid atau sudah kedaluwarsa.');
    }
}

function resolveAdminToken($input) {
    $headerKey = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($headerKey !== '') {
        return $headerKey;
    }
    return $input['admin_token'] ?? '';
}

function checkRateLimit($identifier) {
    $key = 'rl_' . md5($identifier);
    $attempts = intval(cacheGet($key, 0));
    if ($attempts >= 5) {
        throw new Exception('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
    }
}

function recordFailedAttempt($identifier) {
    $key = 'rl_' . md5($identifier);
    $attempts = intval(cacheGet($key, 0)) + 1;
    cacheSet($key, $attempts, 900);
}

function clearFailedAttempts($identifier) {
    $key = 'rl_' . md5($identifier);
    cacheDelete($key);
}

function cacheGet($key, $default = null) {
    $file = __DIR__ . '/../cache/' . $key . '.cache';
    if (!file_exists($file)) {
        return $default;
    }
    $data = json_decode(file_get_contents($file), true);
    if (!$data || $data['expire'] < time()) {
        @unlink($file);
        return $default;
    }
    return $data['value'];
}

function cacheSet($key, $value, $ttl = 900) {
    $dir = __DIR__ . '/../cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $file = $dir . '/' . $key . '.cache';
    $data = [
        'value' => $value,
        'expire' => time() + $ttl,
    ];
    file_put_contents($file, json_encode($data));
}

function cacheDelete($key) {
    $file = __DIR__ . '/../cache/' . $key . '.cache';
    if (file_exists($file)) {
        @unlink($file);
    }
}

function paymentStatus($nominalTagihan, $nominalBayar) {
    if ($nominalBayar >= $nominalTagihan) {
        return 'Lunas';
    }
    if ($nominalBayar <= 0) {
        return 'Belum Bayar';
    }
    return 'Cicil';
}

function loginAnggota($data) {
    $nomorAnggota = normalize($data['nomor_anggota']);
    if (!$nomorAnggota) {
        throw new Exception('nomor_anggota wajib diisi');
    }

    $row = db()->fetchOne(
        "SELECT * FROM anggota WHERE nomor_anggota = ?",
        [$nomorAnggota]
    );

    if (!$row) {
        return ['login' => false, 'role' => 'anggota', 'profil' => null];
    }

    return [
        'login' => true,
        'role' => 'anggota',
        'profil' => $row,
    ];
}

function loginAdmin($data) {
    $email = strtolower(normalize($data['email_admin']));
    $passwordPin = normalize($data['password_pin']);

    if (!$email || !$passwordPin) {
        throw new Exception('email_admin dan password_pin wajib diisi');
    }

    checkRateLimit($email);

    $row = db()->fetchOne(
        "SELECT * FROM admin_user WHERE LOWER(email_admin) = ? AND status_aktif != 'false'",
        [$email]
    );

    if (!$row || !password_verify($passwordPin, $row['password_pin'])) {
        recordFailedAttempt($email);
        return ['login' => false, 'role' => 'admin', 'admin' => null];
    }

    clearFailedAttempts($email);

    $token = bin2hex(random_bytes(32));
    db()->execute("UPDATE admin_user SET session_token = ? WHERE admin_id = ?", [$token, $row['admin_id']]);

    return [
        'login' => true,
        'role' => 'admin',
        'admin' => [
            'admin_id' => $row['admin_id'],
            'nama_admin' => $row['nama_admin'],
            'email_admin' => $row['email_admin'],
            'role' => $row['role'],
            'admin_token' => $token
        ],
    ];
}

function listAnggota($options = []) {
    $page = max(1, intval($options['page'] ?? 1));
    $limit = min(100, max(1, intval($options['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $total = db()->fetchOne("SELECT COUNT(*) as cnt FROM anggota")['cnt'] ?? 0;

    $rows = db()->fetchAll(
        "SELECT * FROM anggota ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [$limit, $offset]
    );

    return [
        'data' => $rows,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit),
        ],
    ];
}

function getAnggotaByNomor($nomorAnggota) {
    return db()->fetchOne(
        "SELECT * FROM anggota WHERE nomor_anggota = ?",
        [normalize($nomorAnggota)]
    );
}

function saveAnggota($data) {
    $mode = strtolower(normalize($data['mode']));
if ($mode === 'list') {
        return listanggota($data);
    }

    $nomorAnggota = normalize($data['nomor_anggota']);
    $namaLengkap = normalize($data['nama_lengkap']);
    $statusAnggota = normalize($data['status_anggota'] ?: 'Aktif');

    if (!$nomorAnggota) {
        throw new Exception('nomor_anggota wajib diisi');
    }
    if (!$namaLengkap) {
        throw new Exception('nama_lengkap wajib diisi');
    }
    if (!in_array($statusAnggota, ['Aktif', 'Nonaktif', 'Cuti'], true)) {
        throw new Exception('status_anggota hanya boleh Aktif, Nonaktif, atau Cuti');
    }

    $memberId = normalize($data['member_id']);
    if (!$memberId) {
        $memberId = generateId('mbr');
        db()->execute(
            "INSERT INTO anggota (member_id, nomor_anggota, nama_lengkap, dojo_cabang, tingkatan_sabuk, peringkat, tanggal_bergabung, status_anggota, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [
                $memberId,
                $nomorAnggota,
                $namaLengkap,
                normalize($data['dojo_cabang'] ?: ''),
                normalize($data['tingkatan_sabuk'] ?: ''),
                normalize($data['peringkat'] ?: ''),
                normalize($data['tanggal_bergabung'] ?: date('Y-m-d')),
                $statusAnggota,
            ]
        );
    } else {
        db()->execute(
            "UPDATE anggota SET nomor_anggota = ?, nama_lengkap = ?, dojo_cabang = ?, tingkatan_sabuk = ?, peringkat = ?, tanggal_bergabung = ?, status_anggota = ?, updated_at = NOW() WHERE member_id = ?",
            [
                $nomorAnggota,
                $namaLengkap,
                normalize($data['dojo_cabang'] ?: ''),
                normalize($data['tingkatan_sabuk'] ?: ''),
                normalize($data['peringkat'] ?: ''),
                normalize($data['tanggal_bergabung'] ?: date('Y-m-d')),
                $statusAnggota,
                $memberId,
            ]
        );
    }

    return [
        'member_id' => $memberId,
        'nomor_anggota' => $nomorAnggota,
        'nama_lengkap' => $namaLengkap,
        'status_anggota' => $statusAnggota,
        'updated_at' => nowIso(),
    ];
}

function getIuranBulananByAnggota($nomorAnggota) {
    $rows = db()->fetchAll(
        "SELECT * FROM iuran_bulanan WHERE nomor_anggota = ? ORDER BY periode DESC",
        [normalize($nomorAnggota)]
    );
    return array_map('mapStatusIuran', $rows);
}

function saveIuranBulanan($data) {
    $nomorAnggota = normalize($data['nomor_anggota']);
    $periode = normalize($data['periode']);

    if (!$nomorAnggota) {
        throw new Exception('nomor_anggota wajib diisi');
    }
    validatePeriod($periode);
    validateNominal($data['nominal_bayar'], 'nominal_bayar');

    $anggota = getAnggotaByNomor($nomorAnggota);
    if (!$anggota) {
        throw new Exception('nomor_anggota tidak ditemukan');
    }

    $nominalTagihan = resolveNominalByType('bulanan', $periode, $data['nominal_tagihan'] ?? null);
    $nominalBayar = toNumber($data['nominal_bayar']);
    $status = paymentStatus($nominalTagihan, $nominalBayar);

    $transaksiId = normalize($data['transaksi_id']) ?: generateId('ibl');
    $tanggalBayar = normalize($data['tanggal_bayar']) ?: date('Y-m-d');

    db()->execute(
        "INSERT INTO iuran_bulanan (transaksi_id, nomor_anggota, periode, nominal_tagihan, nominal_bayar, status_pembayaran, tanggal_bayar, metode_bayar, catatan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
            $transaksiId,
            $nomorAnggota,
            $periode,
            $nominalTagihan,
            $nominalBayar,
            $status,
            $tanggalBayar,
            normalize($data['metode_bayar'] ?: ''),
            normalize($data['catatan'] ?: ''),
        ]
    );

    return [
        'transaksi_id' => $transaksiId,
        'nomor_anggota' => $nomorAnggota,
        'periode' => $periode,
        'nominal_tagihan' => $nominalTagihan,
        'nominal_bayar' => $nominalBayar,
        'status_pembayaran' => $status,
        'tanggal_bayar' => $tanggalBayar,
    ];
}

function getIuranKasByAnggota($nomorAnggota) {
    $rows = db()->fetchAll(
        "SELECT * FROM iuran_kas WHERE nomor_anggota = ? ORDER BY periode DESC",
        [normalize($nomorAnggota)]
    );
    return array_map('mapStatusIuran', $rows);
}

function saveIuranKas($data) {
    $nomorAnggota = normalize($data['nomor_anggota']);
    $periode = normalize($data['periode']);

    if (!$nomorAnggota) {
        throw new Exception('nomor_anggota wajib diisi');
    }
    validatePeriod($periode);
    validateNominal($data['nominal_bayar'], 'nominal_bayar');

    $anggota = getAnggotaByNomor($nomorAnggota);
    if (!$anggota) {
        throw new Exception('nomor_anggota tidak ditemukan');
    }

    $nominalTagihan = resolveNominalByType('kas', $periode, $data['nominal_tagihan'] ?? null);
    $nominalBayar = toNumber($data['nominal_bayar']);
    $status = paymentStatus($nominalTagihan, $nominalBayar);

    $kasId = normalize($data['kas_id']) ?: generateId('iks');
    $tanggalBayar = normalize($data['tanggal_bayar']) ?: date('Y-m-d');

    db()->execute(
        "INSERT INTO iuran_kas (kas_id, nomor_anggota, periode, nominal_tagihan, nominal_bayar, status_pembayaran, tanggal_bayar, metode_bayar, catatan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
            $kasId,
            $nomorAnggota,
            $periode,
            $nominalTagihan,
            $nominalBayar,
            $status,
            $tanggalBayar,
            normalize($data['metode_bayar'] ?: ''),
            normalize($data['catatan'] ?: ''),
        ]
    );

    return [
        'kas_id' => $kasId,
        'nomor_anggota' => $nomorAnggota,
        'periode' => $periode,
        'nominal_tagihan' => $nominalTagihan,
        'nominal_bayar' => $nominalBayar,
        'status_pembayaran' => $status,
        'tanggal_bayar' => $tanggalBayar,
    ];
}

function getDashboardAnggota($data) {
    $nomorAnggota = normalize($data['nomor_anggota']);
    if (!$nomorAnggota) {
        throw new Exception('nomor_anggota wajib diisi');
    }

    $profil = getAnggotaByNomor($nomorAnggota);
    if (!$profil) {
        throw new Exception('Anggota tidak ditemukan');
    }

    $bulanan = getIuranBulananByAnggota($nomorAnggota);
    $kas = getIuranKasByAnggota($nomorAnggota);

    $totalTagihan = array_sum(array_column($bulanan, 'nominal_tagihan')) + array_sum(array_column($kas, 'nominal_tagihan'));
    $totalBayar = array_sum(array_column($bulanan, 'nominal_bayar')) + array_sum(array_column($kas, 'nominal_bayar'));

    return [
        'profil' => $profil,
        'iuran_bulanan' => $bulanan,
        'iuran_kas' => $kas,
        'ringkasan' => [
            'total_tagihan' => $totalTagihan,
            'total_bayar' => $totalBayar,
            'total_tunggakan' => max($totalTagihan - $totalBayar, 0),
        ],
    ];
}

function getDashboardAdmin() {
    $stats = db()->fetchOne("
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status_anggota = 'Aktif' THEN 1 ELSE 0 END) as aktif,
            SUM(CASE WHEN status_anggota = 'Nonaktif' THEN 1 ELSE 0 END) as nonaktif,
            SUM(CASE WHEN status_anggota = 'Cuti' THEN 1 ELSE 0 END) as cuti
        FROM anggota
    ") ?: ['total' => 0, 'aktif' => 0, 'nonaktif' => 0, 'cuti' => 0];

    $tunggakanBulanan = db()->fetchOne("
        SELECT COALESCE(SUM(nominal_tagihan - nominal_bayar), 0) as outstanding
        FROM iuran_bulanan
        WHERE nominal_bayar < nominal_tagihan
    ")['outstanding'] ?? 0;

    $tunggakanKas = db()->fetchOne("
        SELECT COALESCE(SUM(nominal_tagihan - nominal_bayar), 0) as outstanding
        FROM iuran_kas
        WHERE nominal_bayar < nominal_tagihan
    ")['outstanding'] ?? 0;

    return [
        'total_anggota' => $stats['total'],
        'total_anggota_aktif' => $stats['aktif'],
        'total_anggota_nonaktif' => $stats['nonaktif'],
        'total_anggota_cuti' => $stats['cuti'],
        'total_tunggakan_bulanan' => $tunggakanBulanan,
        'total_tunggakan_kas' => $tunggakanKas,
    ];
}

function getSettingIuran() {
    return db()->fetchAll("SELECT * FROM setting_iuran ORDER BY created_at DESC");
}

function updateSettingIuran($data) {
    $mode = strtolower(normalize($data['mode']));
    if ($mode === 'list') {
        return getSettingIuran();
    }

    $namaIuran = normalize($data['nama_iuran']);
    $tipeIuran = strtolower(normalize($data['tipe_iuran']));

    if (!$namaIuran) {
        throw new Exception('nama_iuran wajib diisi');
    }
    if (!$tipeIuran) {
        throw new Exception('tipe_iuran wajib diisi');
    }
    validateNominal($data['nominal_default'], 'nominal_default');

    $settingId = normalize($data['setting_id']);
    $mulaiBerlaku = normalize($data['mulai_berlaku']) ?: date('Y-m');
    $aktif = ($data['aktif'] === false || $data['aktif'] === 'false') ? 0 : 1;

    if (!$settingId) {
        $settingId = generateId('set');
        db()->execute(
            "INSERT INTO setting_iuran (setting_id, nama_iuran, tipe_iuran, nominal_default, aktif, mulai_berlaku, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [$settingId, $namaIuran, $tipeIuran, toNumber($data['nominal_default']), $aktif, $mulaiBerlaku]
        );
    } else {
        db()->execute(
            "UPDATE setting_iuran SET nama_iuran = ?, tipe_iuran = ?, nominal_default = ?, aktif = ?, mulai_berlaku = ?, updated_at = NOW() WHERE setting_id = ?",
            [$namaIuran, $tipeIuran, toNumber($data['nominal_default']), $aktif, $mulaiBerlaku, $settingId]
        );
    }

    return [
        'setting_id' => $settingId,
        'nama_iuran' => $namaIuran,
        'tipe_iuran' => $tipeIuran,
        'nominal_default' => toNumber($data['nominal_default']),
        'aktif' => $aktif,
        'mulai_berlaku' => $mulaiBerlaku,
        'updated_at' => nowIso(),
    ];
}

function resolveNominalByType($typeName, $periode, $overrideNominal) {
    if ($overrideNominal !== null && normalize($overrideNominal) !== '') {
        validateNominal($overrideNominal, 'nominal_tagihan');
        return toNumber($overrideNominal);
    }

    $settings = db()->fetchAll(
        "SELECT * FROM setting_iuran WHERE LOWER(tipe_iuran) = ? AND aktif = 1 AND (mulai_berlaku IS NULL OR mulai_berlaku <= ?) ORDER BY mulai_berlaku DESC",
        [strtolower($typeName), $periode]
    );

    if (!$settings) {
        throw new Exception('Setting iuran aktif untuk tipe ' . $typeName . ' belum ada');
    }

    return toNumber($settings[0]['nominal_default']);
}

function mapStatusIuran($row) {
    $nominalTagihan = toNumber($row['nominal_tagihan']);
    $nominalBayar = toNumber($row['nominal_bayar']);
    return array_merge($row, [
        'nominal_tagihan' => $nominalTagihan,
        'nominal_bayar' => $nominalBayar,
        'status_pembayaran' => paymentStatus($nominalTagihan, $nominalBayar),
    ]);
}

function totalOutstanding($rows) {
    $total = 0;
    foreach ($rows as $row) {
        $total += max(toNumber($row['nominal_tagihan']) - toNumber($row['nominal_bayar']), 0);
    }
    return $total;
}

function updateAdminProfile($data, $token) {
    $nama = normalize($data['nama_admin'] ?? '');
    $email = strtolower(normalize($data['email_admin'] ?? ''));

    if (!$nama || !$email) {
        throw new Exception('Nama dan Email wajib diisi');
    }

    db()->execute(
        "UPDATE admin_user SET nama_admin = ?, email_admin = ? WHERE session_token = ?",
        [$nama, $email, $token]
    );

    $row = db()->fetchOne("SELECT admin_id, nama_admin, email_admin, role FROM admin_user WHERE session_token = ?", [$token]);
    return $row;
}

function updateAdminPassword($data, $token) {
    $passwordBaru = normalize($data['password_baru'] ?? '');
    $konfirmasi = normalize($data['password_konfirmasi'] ?? '');

    if (!$passwordBaru) throw new Exception('Password baru wajib diisi');
    if (strlen($passwordBaru) < 4) throw new Exception('Password minimal 4 karakter');
    if ($passwordBaru !== $konfirmasi) throw new Exception('Konfirmasi password tidak cocok');

    $hash = password_hash($passwordBaru, PASSWORD_DEFAULT);

    db()->execute(
        "UPDATE admin_user SET password_pin = ? WHERE session_token = ?",
        [$hash, $token]
    );

    return true;
}
