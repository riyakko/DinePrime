<?php
require_once __DIR__ . '/../db.php';

try {
    require_method('GET'); 
    $user = require_auth();

    // 1. Core query includes table_id and order_type explicitly
    $sql = 'SELECT 
                o.id, 
                o.user_id, 
                o.table_id,
                o.order_type,
                u.name AS customer_name, 
                u.email AS customer_email, 
                o.total_amount, 
                o.status, 
                o.notes, 
                t.table_number,
                t.location_description,
                o.created_at, 
                o.updated_at 
            FROM orders o 
            JOIN users u ON u.id = o.user_id
            LEFT JOIN tables t ON t.id = o.table_id'; 
            
    $params = [];

    if ($user['role'] === 'customer') {
        $sql .= ' WHERE o.user_id = ?'; 
        $params[] = $user['id']; 
    } elseif (!empty($_GET['status'])) { 
        $statuses = array_values(array_filter(array_map('trim', explode(',', (string)$_GET['status'])))); 
        if ($statuses) {
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $sql .= ' WHERE o.status IN (' . $placeholders . ')';
            $params = array_merge($params, $statuses); 
        } 
    }

    $sql .= ' ORDER BY o.created_at DESC'; 
    $statement = db()->prepare($sql); 
    $statement->execute($params); 
    $orders = $statement->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orders)) {
        json_response(['orders' => []]);
    }

    // Category preparation mapping (in minutes)
    $categoryPrepTimes = [
        'beverage'  => 5,
        'beverages' => 5,
        'drink'     => 5,
        'drinks'    => 5,
        'dessert'   => 10,
        'desserts'  => 10,
        'burger'    => 30,
        'burgers'   => 30,
        'mains'     => 30,
        'side'      => 60,
        'sides'     => 60,
    ];

    // 2. Optimized batch fetch for order items
    $orderIds = array_column($orders, 'id');
    $inClause = implode(',', array_fill(0, count($orderIds), '?'));

    $itemsStmt = db()->prepare("
        SELECT 
            oi.order_id, 
            oi.menu_item_id, 
            oi.quantity, 
            oi.unit_price, 
            oi.subtotal, 
            oi.special_instructions, 
            m.name,
            c.name AS category_name
        FROM order_items oi 
        JOIN menu_items m ON m.id = oi.menu_item_id 
        LEFT JOIN categories c ON c.id = m.category_id
        WHERE oi.order_id IN ($inClause)
    ");
    $itemsStmt->execute($orderIds);
    $allItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Group items by order_id
    $itemsByOrder = [];
    foreach ($allItems as $item) {
        $categoryName = strtolower(trim((string)($item['category_name'] ?? '')));
        $item['prep_time_minutes'] = $categoryPrepTimes[$categoryName] ?? 15;
        $itemsByOrder[$item['order_id']][] = $item;
    }

    // 3. Map items and calculate estimated preparation times
    foreach ($orders as &$order) {
        $orderItems = $itemsByOrder[$order['id']] ?? [];
        $maxPrep = 5;

        foreach ($orderItems as $item) {
            if ($item['prep_time_minutes'] > $maxPrep) {
                $maxPrep = $item['prep_time_minutes'];
            }
        }

        $order['items'] = $orderItems;
        $order['estimated_prep_minutes'] = $maxPrep;
    }

    json_response(['orders' => $orders]);

} catch (Throwable $error) { 
    handle_api_error($error); 
}