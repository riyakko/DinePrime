<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('PUT');
    $user = require_auth(['customer', 'staff', 'admin']);
    $input = body();
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') json_response(['error' => 'Name is required.'], 422);
    $statement = db()->prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?');
    $statement->execute([$name, trim((string) ($input['phone'] ?? '')), trim((string) ($input['address'] ?? '')), $user['id']]);
    $fresh = db()->prepare('SELECT * FROM users WHERE id = ?');
    $fresh->execute([$user['id']]);
    $_SESSION['user'] = public_user($fresh->fetch());
    json_response(['user' => $_SESSION['user']]);
} catch (Throwable $error) { handle_api_error($error); }
