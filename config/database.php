<?php
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    $config = require $configFile;
    define('DB_HOST', $config['host'] ?? 'localhost');
    define('DB_NAME', $config['database'] ?? 'highkick_db');
    define('DB_USER', $config['username'] ?? 'highkick_user');
    define('DB_PASS', $config['password'] ?? '');
    define('DB_CHARSET', $config['charset'] ?? 'utf8mb4');
} else {
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
    define('DB_NAME', getenv('DB_NAME') ?: 'highkick_db');
    define('DB_USER', getenv('DB_USER') ?: 'highkick_user');
    define('DB_PASS', getenv('DB_PASS') ?: '');
    define('DB_CHARSET', 'utf8mb4');
}

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $dsn = sprintf("mysql:host=%s;dbname=%s;charset=%s", DB_HOST, DB_NAME, DB_CHARSET);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function execute($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
}

function db() {
    return Database::getInstance();
}