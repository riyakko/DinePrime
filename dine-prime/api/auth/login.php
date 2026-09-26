<?php
// Ensure session is active before regenerating ID or setting $_SESSION
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set standard JSON response header immediately
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../db.php';

    // 1. Method check fallback
    if (function_exists('require_method')) {
        require_method('POST');
    } else if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit();
    }

    // 2. Parse JSON body input
    $input = function_exists('body') ? body() : json_decode(file_get_contents('php://input'), true) ?? [];

    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required.']);
        exit();
    }

    // 3. Database query execution
    $pdo = function_exists('db') ? db() : $pdo; // Uses db() helper or global $pdo from db.php
    $statement = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);

    // 4. Verify password
    if (!$user || !password_verify($password, $user['password_hash'])) {
        if (function_exists('json_response')) {
            json_response(['error' => 'Email or password is incorrect.'], 401);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Email or password is incorrect.']);
            exit();
        }
    }

    // 5. Manage session & public user output
    session_regenerate_id(true);
    
    $publicUser = function_exists('public_user') ? public_user($user) : [
        'id' => $user['id'],
        'name' => $user['name'] ?? '',
        'email' => $user['email'],
        'role' => $user['role'] ?? 'customer'
    ];

    $_SESSION['user'] = $publicUser;

    if (function_exists('json_response')) {
        json_response(['user' => $publicUser]);
    } else {
        http_response_code(200);
        echo json_encode(['user' => $publicUser]);
        exit();
    }

} catch (Throwable $error) {
    if (function_exists('handle_api_error')) {
        handle_api_error($error);
    } else {
        http_response_code(500);
        echo json_encode(['error' => $error->getMessage()]);
        exit();
    }
}