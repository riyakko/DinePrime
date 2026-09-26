<?php
declare(strict_types=1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DB_HOST = 'sql312.infinityfree.com';
const DB_NAME = 'if0_43006599_dineprime';
const DB_USER = 'if0_43006599';
const DB_PASS = 'NsUHO1M6g9i';

session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 7,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function db(): PDO {
    static $connection;
    if (!$connection) {
        $connection = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
        );
    }
    return $connection;
}

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function public_user(array $user): array {
    return ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'], 'phone' => $user['phone'] ?? null, 'address' => $user['address'] ?? null];
}

function require_auth(array $roles = []): array {
    $user = $_SESSION['user'] ?? null;
    if (!$user) json_response(['error' => 'Authentication required.'], 401);
    if ($roles && !in_array($user['role'], $roles, true)) json_response(['error' => 'You do not have permission to access this resource.'], 403);
    return $user;
}

function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== $method) json_response(['error' => 'Method not allowed.'], 405);
}

function validate_id(): int {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if (!$id) json_response(['error' => 'A valid id is required.'], 422);
    return $id;
}

function handle_api_error(Throwable $error): never {
    error_log($error->getMessage());
    json_response(['error' => 'The server could not complete that request.'], 500);
}
