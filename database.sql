-- Tujuan file/module: Menyediakan schema MySQL final + seed data siap import untuk login, dashboard, dan operasi admin Highkick Taekwondo.
-- Pemakai oleh siapa: phpMyAdmin/cPanel import, backend PHP `api/index.php`, dan proses setup database awal.
-- Dependensi utama: MySQL 5.7+/MariaDB kompatibel utf8mb4, route API PHP yang membaca tabel `anggota`, `admin_user`, `setting_iuran`, `iuran_bulanan`, dan `iuran_kas`.
-- Daftar fungsi public/utama: DDL create/drop table, seed admin default, seed anggota default termasuk `TKD-001`, seed setting iuran, dan seed histori iuran contoh.
-- Side effect penting: Menghapus tabel lama lalu membuat ulang seluruh data inti pada database target saat file ini di-import.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- --------------------------------
-- Reset existing tables
-- --------------------------------
DROP TABLE IF EXISTS `iuran_kas`;
DROP TABLE IF EXISTS `iuran_bulanan`;
DROP TABLE IF EXISTS `setting_iuran`;
DROP TABLE IF EXISTS `anggota`;
DROP TABLE IF EXISTS `admin_user`;

-- --------------------------------
-- Table structure for admin_user
-- --------------------------------
CREATE TABLE `admin_user` (
  `admin_id` varchar(50) NOT NULL,
  `nama_admin` varchar(100) NOT NULL,
  `email_admin` varchar(100) NOT NULL,
  `password_pin` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'admin',
  `status_aktif` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uk_admin_user_email` (`email_admin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------
-- Table structure for anggota
-- --------------------------------
CREATE TABLE `anggota` (
  `member_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `jenis_kelamin` varchar(20) DEFAULT '',
  `tanggal_lahir` date DEFAULT NULL,
  `no_hp` varchar(30) DEFAULT '',
  `alamat` text,
  `dojo_cabang` varchar(100) DEFAULT '',
  `tingkatan_sabuk` varchar(50) DEFAULT '',
  `peringkat` varchar(50) DEFAULT '',
  `tanggal_bergabung` date DEFAULT NULL,
  `status_anggota` varchar(20) NOT NULL DEFAULT 'Aktif',
  `foto_url` varchar(255) DEFAULT '',
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `uk_anggota_nomor` (`nomor_anggota`),
  KEY `idx_anggota_status` (`status_anggota`),
  KEY `idx_anggota_dojo` (`dojo_cabang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------
-- Table structure for setting_iuran
-- --------------------------------
CREATE TABLE `setting_iuran` (
  `setting_id` varchar(50) NOT NULL,
  `nama_iuran` varchar(100) NOT NULL,
  `tipe_iuran` varchar(20) NOT NULL,
  `nominal_default` int(11) NOT NULL DEFAULT 0,
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `mulai_berlaku` varchar(7) DEFAULT NULL,
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  KEY `idx_setting_iuran_tipe_aktif` (`tipe_iuran`, `aktif`, `mulai_berlaku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------
-- Table structure for iuran_bulanan
-- --------------------------------
CREATE TABLE `iuran_bulanan` (
  `transaksi_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `periode` varchar(7) NOT NULL,
  `nominal_tagihan` int(11) NOT NULL DEFAULT 0,
  `nominal_bayar` int(11) NOT NULL DEFAULT 0,
  `status_pembayaran` varchar(20) NOT NULL DEFAULT 'Belum Bayar',
  `tanggal_bayar` date DEFAULT NULL,
  `metode_bayar` varchar(50) DEFAULT '',
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaksi_id`),
  KEY `idx_iuran_bulanan_nomor_periode` (`nomor_anggota`, `periode`),
  KEY `idx_iuran_bulanan_status` (`status_pembayaran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------
-- Table structure for iuran_kas
-- --------------------------------
CREATE TABLE `iuran_kas` (
  `kas_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `periode` varchar(7) NOT NULL,
  `nominal_tagihan` int(11) NOT NULL DEFAULT 0,
  `nominal_bayar` int(11) NOT NULL DEFAULT 0,
  `status_pembayaran` varchar(20) NOT NULL DEFAULT 'Belum Bayar',
  `tanggal_bayar` date DEFAULT NULL,
  `metode_bayar` varchar(50) DEFAULT '',
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kas_id`),
  KEY `idx_iuran_kas_nomor_periode` (`nomor_anggota`, `periode`),
  KEY `idx_iuran_kas_status` (`status_pembayaran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------
-- Initial data: admin users
-- Default password untuk kedua admin di bawah: 1234
-- --------------------------------
INSERT INTO `admin_user` (`admin_id`, `nama_admin`, `email_admin`, `password_pin`, `role`, `status_aktif`) VALUES
('adm_001', 'Administrator Highkick', 'admin@highkick.com', '$2y$10$1VML40LKi2NL2OS2oD7LU.9L8YN38//f0C6Sk4DPRNdC2hfoZB2ii', 'superadmin', 'true'),
('adm_002', 'Admin Dojo', 'admin@dojo.com', '$2y$10$1VML40LKi2NL2OS2oD7LU.9L8YN38//f0C6Sk4DPRNdC2hfoZB2ii', 'admin', 'true');

-- --------------------------------
-- Initial data: anggota
-- `TKD-001` sengaja disiapkan agar login anggota langsung bisa dites setelah import.
-- --------------------------------
INSERT INTO `anggota` (
  `member_id`,
  `nomor_anggota`,
  `nama_lengkap`,
  `jenis_kelamin`,
  `tanggal_lahir`,
  `no_hp`,
  `alamat`,
  `dojo_cabang`,
  `tingkatan_sabuk`,
  `peringkat`,
  `tanggal_bergabung`,
  `status_anggota`,
  `foto_url`,
  `catatan`
) VALUES
('mbr_001', 'TKD-001', 'Bagas Pratama', 'Laki-laki', '2008-06-14', '081234567890', 'Jl. Kaliurang Km 8, Sleman, DIY', 'Highkick Jogja Pusat', 'Hijau', '6 Kyu', '2024-01-15', 'Aktif', '', 'Seed utama untuk uji login anggota production.'),
('mbr_002', 'TKD-002', 'Nabila Putri', 'Perempuan', '2009-02-03', '081234567891', 'Jl. Magelang Km 7, Sleman, DIY', 'Highkick Jogja Barat', 'Biru', '4 Kyu', '2024-03-10', 'Aktif', '', 'Seed tambahan untuk dashboard admin.'),
('mbr_003', 'TKD-003', 'Rizky Saputra', 'Laki-laki', '2007-11-21', '081234567892', 'Jl. Wates Km 5, Bantul, DIY', 'Highkick Jogja Selatan', 'Kuning', '8 Kyu', '2024-05-20', 'Cuti', '', 'Contoh anggota dengan status cuti.'),
('mbr_004', 'TKD-004', 'Salsa Maharani', 'Perempuan', '2006-09-01', '081234567893', 'Jl. Solo Km 11, Sleman, DIY', 'Highkick Jogja Timur', 'Merah', '7 Kyu', '2023-12-12', 'Nonaktif', '', 'Contoh anggota dengan status nonaktif.');

-- --------------------------------
-- Initial data: setting iuran
-- --------------------------------
INSERT INTO `setting_iuran` (`setting_id`, `nama_iuran`, `tipe_iuran`, `nominal_default`, `aktif`, `mulai_berlaku`, `catatan`) VALUES
('set_bulanan_001', 'Iuran Bulanan', 'bulanan', 150000, 1, '2026-01', 'Nominal default iuran bulanan anggota Highkick.'),
('set_kas_001', 'Iuran Kas', 'kas', 50000, 1, '2026-01', 'Nominal default iuran kas dojo.');

-- --------------------------------
-- Initial data: iuran bulanan
-- --------------------------------
INSERT INTO `iuran_bulanan` (
  `transaksi_id`,
  `nomor_anggota`,
  `periode`,
  `nominal_tagihan`,
  `nominal_bayar`,
  `status_pembayaran`,
  `tanggal_bayar`,
  `metode_bayar`,
  `catatan`
) VALUES
('ibl_202604_tkd001', 'TKD-001', '2026-04', 150000, 150000, 'Lunas', '2026-04-05', 'Transfer', 'Pembayaran iuran bulanan April lunas.'),
('ibl_202605_tkd001', 'TKD-001', '2026-05', 150000, 100000, 'Cicil', '2026-05-07', 'Transfer', 'Cicilan pertama untuk periode Mei.'),
('ibl_202604_tkd002', 'TKD-002', '2026-04', 150000, 0, 'Belum Bayar', NULL, '', 'Belum ada pembayaran untuk periode April.');

-- --------------------------------
-- Initial data: iuran kas
-- --------------------------------
INSERT INTO `iuran_kas` (
  `kas_id`,
  `nomor_anggota`,
  `periode`,
  `nominal_tagihan`,
  `nominal_bayar`,
  `status_pembayaran`,
  `tanggal_bayar`,
  `metode_bayar`,
  `catatan`
) VALUES
('iks_202604_tkd001', 'TKD-001', '2026-04', 50000, 50000, 'Lunas', '2026-04-05', 'Tunai', 'Kas dojo April lunas.'),
('iks_202605_tkd001', 'TKD-001', '2026-05', 50000, 0, 'Belum Bayar', NULL, '', 'Kas dojo Mei belum dibayar.'),
('iks_202604_tkd002', 'TKD-002', '2026-04', 50000, 50000, 'Lunas', '2026-04-08', 'Transfer', 'Kas dojo April lunas.');

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------
-- Default credential reference setelah import
-- --------------------------------
-- Login anggota siap pakai:
--   nomor_anggota: TKD-001
--
-- Login admin siap pakai:
--   email_admin: admin@highkick.com
--   password_pin: 1234
--
-- Alternatif admin tambahan:
--   email_admin: admin@dojo.com
--   password_pin: 1234
