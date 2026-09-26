<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('GET');
    json_response(['authenticated' => isset($_SESSION['user']), 'user' => $_SESSION['user'] ?? null]);
} catch (Throwable $error) { handle_api_error($error); }
