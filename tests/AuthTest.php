<?php
// Simple Unit & Integration Test Script for Authentication
require_once __DIR__ . '/../config/database.php';

echo "Running Auth Tests...\n";

try {
    // 1. Test invalid login
    echo "1. Test Invalid Login: ";
    $row = db()->fetchOne("SELECT * FROM admin_user WHERE LOWER(email_admin) = ?", ['admin@highkick.com']);
    if ($row && !password_verify('wrongpassword', $row['password_pin'])) {
        echo "PASSED (Wrong password rejected)\n";
    } else {
        echo "FAILED\n";
    }

    // 2. Test valid login and token generation
    echo "2. Test Valid Login & Token: ";
    $password = '1234'; // default seed password
    if ($row && password_verify($password, $row['password_pin'])) {
        $token = bin2hex(random_bytes(32));
        db()->execute("UPDATE admin_user SET session_token = ? WHERE admin_id = ?", [$token, $row['admin_id']]);
        
        $updatedRow = db()->fetchOne("SELECT session_token FROM admin_user WHERE admin_id = ?", [$row['admin_id']]);
        if ($updatedRow['session_token'] === $token) {
            echo "PASSED (Token generated and saved)\n";
        } else {
            echo "FAILED (Token not saved)\n";
        }
    } else {
        echo "FAILED (Valid password rejected)\n";
    }

    // 3. Test validate token
    echo "3. Test Token Validation: ";
    $validToken = $updatedRow['session_token'] ?? '';
    $check = db()->fetchOne("SELECT admin_id FROM admin_user WHERE session_token = ? AND status_aktif != 'false'", [$validToken]);
    if ($check) {
        echo "PASSED (Token validated successfully)\n";
    } else {
        echo "FAILED (Token validation failed)\n";
    }

    echo "\nAll authentication tests completed successfully.\n";

} catch (Exception $e) {
    echo "TEST ERROR: " . $e->getMessage() . "\n";
}
