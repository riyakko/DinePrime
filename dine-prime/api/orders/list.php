<?php
require_once __DIR__ . '/../db.php';

try {
    require_method('GET'); 
    $user = require_auth();

    // 1. Fetch Orders
    $sql = 'SELECT o.id, o.user_id, u.name AS customer_name, u.email AS customer_email, o.total_amount, o.status, o.notes, o.created_at, o.updated_at FROM orders o JOIN users u ON u.id = o.user_id'; 
    $params = [];

    if ($user['role'] === 'customer') { 
        $sql .= ' WHERE o.user_id = ?'; 
        $params[] = $user['id']; 
    } elseif (!empty($_GET['status'])) { 
        $statuses = array_values(array_filter(array_map('trim', explode(',', (string) $_GET['status'])))); 
        if ($statuses) { 
            $placeholders = implode(',', array_fill(0, count($statuses), '?')); 
            $sql .= ' WHERE o.status IN (' . $placeholders . ')'; 
            $params = array_merge($params, $statuses); 
        } 
    }

    $sql .= ' ORDER BY o.created_at DESC'; 
    $statement = db()->prepare($sql); 
    $statement->execute($params); 
    $orders = $statement->fetchAll();

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

    // 2. Fetch order items with Category Join
    $itemsStmt = db()->prepare('
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
        WHERE oi.order_id = ?
    ');

    // 3. Attach Items & Prep Times
    foreach ($orders as &$order) { 
        $itemsStmt->execute([$order['id']]); 
        $orderItems = $itemsStmt->fetchAll();
        $maxPrep = 5;

        foreach ($orderItems as &$item) {
            $categoryName = strtolower(trim((string)($item['category_name'] ?? '')));
            $itemPrepTime = $categoryPrepTimes[$categoryName] ?? 15;

            $item['prep_time_minutes'] = $itemPrepTime;
            if ($itemPrepTime > $maxPrep) {
                $maxPrep = $itemPrepTime;
            }
        }

        $order['items'] = $orderItems;
        $order['estimated_prep_minutes'] = $maxPrep;
    }

    json_response(['orders' => $orders]);

} catch (Throwable $error) { 
    handle_api_error($error); 
}