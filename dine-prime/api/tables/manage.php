<?php
define('ALLOW_PUBLIC_ACCESS', true); 

$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://dineprime.xo.je';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    // 2. Public GET Endpoint - MUST EXIT IMMEDIATELY
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $date = trim((string) ($_GET['date'] ?? date('Y-m-d'))); 
        $time = trim((string) ($_GET['time'] ?? '19:30'));

        $statement = db()->prepare("
            SELECT t.*, 
                   CASE WHEN r.id IS NULL THEN 'Available' ELSE 'Reserved' END AS status 
            FROM tables t 
            LEFT JOIN reservations r ON r.table_id = t.id 
                AND r.reservation_date = ? 
                AND r.reservation_time = ? 
                AND r.status IN ('Pending', 'Confirmed') 
            WHERE t.is_active = 1
            ORDER BY t.id
        "); 
        $statement->execute([$date, $time]); 
        
        json_response(['tables' => $statement->fetchAll()]);
        exit;
    }

    // 3. Authenticated POST/PUT Endpoints
    $user = require_auth(['staff', 'admin']);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
        $input = body(); 
        $statement = db()->prepare('INSERT INTO tables (table_number, capacity, location_description, is_active) VALUES (?, ?, ?, ?)'); 
        $statement->execute([
            trim($input['table_number'] ?? ''), 
            max(1, (int) ($input['capacity'] ?? 2)), 
            trim($input['location_description'] ?? 'Main Dining'), 
            !empty($input['is_active']) ? 1 : 0
        ]); 
        json_response(['id' => (int) db()->lastInsertId()], 201); 
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') { 
        $id = (int) ($_GET['id'] ?? 0); 
        $input = body(); 
        if ($id < 1) {
            json_response(['error' => 'A valid table id is required.'], 422);
            exit;
        }
        
        db()->prepare('UPDATE tables SET capacity = ?, location_description = ?, is_active = ? WHERE id = ?')
            ->execute([
                max(1, (int) ($input['capacity'] ?? 2)), 
                trim($input['location_description'] ?? 'Main Dining'), 
                !empty($input['is_active']) ? 1 : 0, 
                $id
            ]); 
        json_response(['ok' => true]); 
        exit;
    }

    json_response(['error' => 'Method not allowed.'], 405);

} catch (Throwable $error) { 
    handle_api_error($error); 
}