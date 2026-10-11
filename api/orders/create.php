<?php
header('Content-Type: application/json');
require_once '../../db.php'; // Adjust path to your database connection file if needed

session_start();

// Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please sign in to place an order.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$user_id = $_SESSION['user_id'];
$order_type = $data['order_type'] ?? 'Takeout';
$table_id = $data['table_id'] ?? null;
$items = $data['items'] ?? [];
$payment_method = $data['payment_method'] ?? 'cash';
$total_amount = $data['amount'] ?? 0;

if (empty($items)) {
    http_response_code(400);
    echo json_encode(['error' => 'Order must contain at least one item.']);
    exit;
}

if (strtolower($order_type) === 'takeout' || strtolower($order_type) === 'walk-in') {
    $table_id = null;
}

try {
    // Start transaction
    $pdo->beginTransaction();

    // 1. Insert main order
    $stmt = $pdo->prepare("INSERT INTO orders (user_id, order_type, table_id, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, 'Pending', NOW())");
    $stmt->execute([$user_id, $order_type, $table_id, $total_amount, $payment_method]);
    $order_id = $pdo->lastInsertId();

    // 2. Insert order items
    $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, special_instructions) VALUES (?, ?, ?, ?)");
    
    foreach ($items as $item) {
        $itemStmt->execute([
            $order_id,
            $item['menu_item_id'],
            $item['quantity'],
            $item['special_instructions'] ?? ''
        ]);
    }

    $pdo->commit();

    // Fetch the created order with guest details to return instantly
    $fetchStmt = $pdo->prepare("
        SELECT o.*, u.name as customer_name, u.email as customer_email 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.id = ?
    ");
    $fetchStmt->execute([$order_id]);
    $newOrder = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'order' => $newOrder]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}