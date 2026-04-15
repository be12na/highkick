<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Api-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';

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
    } elseif (strpos($path, 'health') !== false) {
        $action = 'health';
    }
}

if (!$action) {
    jsonResponse(false, 'action wajib diisi', null, 400);
}

try {
    $result = null;
    $data = $input['data'] ?? [];

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
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = getDashboardAdmin();
            break;
        case 'saveAnggota':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = saveAnggota($data);
            break;
        case 'listAnggota':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = listAnggota();
            break;
        case 'updateSettingIuran':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = updateSettingIuran($data);
            break;
        case 'getSettingIuran':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = getSettingIuran();
            break;
        case 'saveIuranBulanan':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = saveIuranBulanan($data);
            break;
        case 'saveIuranKas':
            validateAdminKey($input['internal_api_key'] ?? '');
            $result = saveIuranKas($data);
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

function validateAdminKey($providedKey) {
    if (normalize($providedKey) !== INTERNAL_API_KEY) {
        throw new Exception('Internal API key tidak valid');
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

    $row = db()->fetchOne(
        "SELECT * FROM admin_user WHERE LOWER(email_admin) = ? AND password_pin = ? AND status_aktif != 'false'",
        [$email, $passwordPin]
    );

    if (!$row) {
        return ['login' => false, 'role' => 'admin', 'admin' => null];
    }

    return [
        'login' => true,
        'role' => 'admin',
        'admin' => [
            'admin_id' => $row['admin_id'],
            'nama_admin' => $row['nama_admin'],
            'email_admin' => $row['email_admin'],
            'role' => $row['role'],
        ],
    ];
}

function listAnggota() {
    return db()->fetchAll("SELECT * FROM anggota ORDER BY created_at DESC");
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
        return listAnggota();
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
            "INSERT INTO anggota (member_id, nomor_anggota, nama_lengkap, dojo_cabang, tingkatan_sabuk, peringkat, tanggal_bergabung, status_anggota, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
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
    $anggota = listAnggota();
    $bulanan = db()->fetchAll("SELECT * FROM iuran_bulanan");
    $kas = db()->fetchAll("SELECT * FROM iuran_kas");

    $bulanan = array_map('mapStatusIuran', $bulanan);
    $kas = array_map('mapStatusIuran', $kas);

    $totalAktif = 0;
    $totalNonaktif = 0;
    $totalCuti = 0;
    foreach ($anggota as $a) {
        $status = normalize($a['status_anggota']);
        if ($status === 'Aktif') $totalAktif++;
        elseif ($status === 'Nonaktif') $totalNonaktif++;
        elseif ($status === 'Cuti') $totalCuti++;
    }

    return [
        'total_anggota' => count($anggota),
        'total_anggota_aktif' => $totalAktif,
        'total_anggota_nonaktif' => $totalNonaktif,
        'total_anggota_cuti' => $totalCuti,
        'total_tunggakan_bulanan' => totalOutstanding($bulanan),
        'total_tunggakan_kas' => totalOutstanding($kas),
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