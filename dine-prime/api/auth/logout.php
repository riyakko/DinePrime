<?php
require_once __DIR__ . '/../db.php';

try {
    require_method('POST');

    // 1. Ensure the session is active before trying to clear/destroy it
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // 2. Clear session data
    $_SESSION = [];

    // 3. Clear session cookie
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'] ?? '',
            $params['secure'],
            $params['httponly']
        );
    }

    // 4. Safely destroy session
    session_destroy();

    json_response(['ok' => true]);
} catch (Throwable $error) {
    handle_api_error($error);
}