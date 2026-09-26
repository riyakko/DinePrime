<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('POST');
    $input = body();
    $name = trim((string) ($input['name'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) json_response(['error' => 'Name, valid email, and a password of at least 8 characters are required.'], 422);
    $check = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) json_response(['error' => 'An account with that email already exists.'], 409);
    $statement = db()->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'customer\')');
    $statement->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT)]);
    $userStatement = db()->prepare('SELECT * FROM users WHERE id = ?');
    $userStatement->execute([(int) db()->lastInsertId()]);
    $user = $userStatement->fetch();
    session_regenerate_id(true);
    $_SESSION['user'] = public_user($user);
    json_response(['user' => $_SESSION['user']], 201);
} catch (Throwable $error) { handle_api_error($error); }
