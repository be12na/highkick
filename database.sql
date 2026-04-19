-- Highkick Taekwondo Database Schema
-- Compatible with MySQL 5.7+ and cPanel hosting

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin_user
-- ----------------------------
DROP TABLE IF EXISTS `admin_user`;
CREATE TABLE `admin_user` (
  `admin_id` varchar(50) NOT NULL,
  `nama_admin` varchar(100) NOT NULL,
  `email_admin` varchar(100) NOT NULL,
  `password_pin` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'admin',
  `status_aktif` varchar(10) DEFAULT 'true',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `email_admin` (`email_admin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for anggota
-- ----------------------------
DROP TABLE IF EXISTS `anggota`;
CREATE TABLE `anggota` (
  `member_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `dojo_cabang` varchar(100) DEFAULT '',
  `tingkatan_sabuk` varchar(50) DEFAULT '',
  `peringkat` varchar(50) DEFAULT '',
  `tanggal_bergabung` date DEFAULT NULL,
  `status_anggota` varchar(20) DEFAULT 'Aktif',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `nomor_anggota` (`nomor_anggota`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for setting_iuran
-- ----------------------------
DROP TABLE IF EXISTS `setting_iuran`;
CREATE TABLE `setting_iuran` (
  `setting_id` varchar(50) NOT NULL,
  `nama_iuran` varchar(100) NOT NULL,
  `tipe_iuran` varchar(20) NOT NULL,
  `nominal_default` int(11) NOT NULL DEFAULT 0,
  `aktif` tinyint(1) DEFAULT 1,
  `mulai_berlaku` varchar(7) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for iuran_bulanan
-- ----------------------------
DROP TABLE IF EXISTS `iuran_bulanan`;
CREATE TABLE `iuran_bulanan` (
  `transaksi_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `periode` varchar(7) NOT NULL,
  `nominal_tagihan` int(11) NOT NULL DEFAULT 0,
  `nominal_bayar` int(11) NOT NULL DEFAULT 0,
  `status_pembayaran` varchar(20) DEFAULT 'Belum Bayar',
  `tanggal_bayar` date DEFAULT NULL,
  `metode_bayar` varchar(50) DEFAULT '',
  `catatan` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaksi_id`),
  KEY `idx_nomor_anggota` (`nomor_anggota`),
  KEY `idx_periode` (`periode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for iuran_kas
-- ----------------------------
DROP TABLE IF EXISTS `iuran_kas`;
CREATE TABLE `iuran_kas` (
  `kas_id` varchar(50) NOT NULL,
  `nomor_anggota` varchar(50) NOT NULL,
  `periode` varchar(7) NOT NULL,
  `nominal_tagihan` int(11) NOT NULL DEFAULT 0,
  `nominal_bayar` int(11) NOT NULL DEFAULT 0,
  `status_pembayaran` varchar(20) DEFAULT 'Belum Bayar',
  `tanggal_bayar` date DEFAULT NULL,
  `metode_bayar` varchar(50) DEFAULT '',
  `catatan` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kas_id`),
  KEY `idx_nomor_anggota` (`nomor_anggota`),
  KEY `idx_periode` (`periode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- Initial Data - Admin User (password: admin123, hashed with password_hash)
-- ----------------------------
INSERT INTO `admin_user` (`admin_id`, `nama_admin`, `email_admin`, `password_pin`, `role`, `status_aktif`) VALUES
('adm_001', 'Administrator', 'admin@highkick.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'true');

-- ----------------------------
-- Initial Data - Setting Iuran
-- ----------------------------
INSERT INTO `setting_iuran` (`setting_id`, `nama_iuran`, `tipe_iuran`, `nominal_default`, `aktif`, `mulai_berlaku`) VALUES
('set_bulanan_001', 'Iuran Bulanan', 'bulanan', 150000, 1, '2026-01'),
('set_kas_001', 'Iuran Kas', 'kas', 50000, 1, '2026-01');

-- ----------------------------
-- Sample Queries
-- ----------------------------

-- Add anggota:
-- INSERT INTO `anggota` (`member_id`, `nomor_anggota`, `nama_lengkap`, `dojo_cabang`, `tingkatan_sabuk`, `peringkat`, `tanggal_bergabung`, `status_anggota`) VALUES
-- ('mbr_001', 'TKD-001', 'Ahmad Fauzi', 'Jakarta Pusat', 'Hitam', '1 Kyu', '2024-01-15', 'Aktiv');

-- Update admin password:
-- UPDATE admin_user SET password_pin = 'newpassword123' WHERE admin_id = 'adm_001';