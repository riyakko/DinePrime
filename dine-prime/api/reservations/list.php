<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('GET'); $user = require_auth(); $all = !empty($_GET['all']);
    if ($all && !in_array($user['role'], ['staff', 'admin'], true)) json_response(['error' => 'Staff authorization required.'], 403);
    $sql = 'SELECT r.id, r.user_id, u.name AS customer_name, u.email AS customer_email, r.table_id, t.table_number, t.location_description, r.reservation_date, r.reservation_time, r.party_size, r.status, r.notes, r.created_at FROM reservations r JOIN users u ON u.id = r.user_id JOIN tables t ON t.id = r.table_id'; $params = [];
    if (!$all) { $sql .= ' WHERE r.user_id = ?'; $params[] = $user['id']; } $sql .= ' ORDER BY r.reservation_date DESC, r.reservation_time DESC';
    $statement = db()->prepare($sql); $statement->execute($params); $reservations = $statement->fetchAll(); $addon = db()->prepare('SELECT ra.menu_item_id, ra.quantity, ra.unit_price, m.name FROM reservation_add_ons ra JOIN menu_items m ON m.id = ra.menu_item_id WHERE ra.reservation_id = ?');
    foreach ($reservations as &$reservation) { $addon->execute([$reservation['id']]); $reservation['add_ons'] = $addon->fetchAll(); }
    json_response(['reservations' => $reservations]);
} catch (Throwable $error) { handle_api_error($error); }
