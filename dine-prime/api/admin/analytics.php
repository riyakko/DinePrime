<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('GET'); require_auth(['staff', 'admin']);
    $pdo = db();
    $revenue = $pdo->query("SELECT COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS today, COALESCE(SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS week, COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS month FROM orders")->fetch();
    $top = $pdo->query("SELECT m.name, SUM(oi.quantity) AS quantity, SUM(oi.subtotal) AS revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN menu_items m ON m.id = oi.menu_item_id WHERE o.status <> 'Cancelled' GROUP BY m.id, m.name ORDER BY quantity DESC LIMIT 5")->fetchAll();
    $slots = $pdo->query("SELECT DATE_FORMAT(reservation_time, '%H:%i') AS time_slot, COUNT(*) AS reservations, ROUND(AVG(party_size), 1) AS average_party_size FROM reservations WHERE status IN ('Pending', 'Confirmed', 'Completed') GROUP BY time_slot ORDER BY reservation_time")->fetchAll();
    json_response(['revenue' => ['today' => (float) $revenue['today'], 'week' => (float) $revenue['week'], 'month' => (float) $revenue['month']], 'top_items' => $top, 'reservation_slots' => $slots]);
} catch (Throwable $error) { handle_api_error($error); }
