<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('POST'); $user = require_auth(['customer']); $input = body();
    $date = trim((string) ($input['reservation_date'] ?? '')); $time = trim((string) ($input['reservation_time'] ?? '')); $party = (int) ($input['party_size'] ?? 0); $tableId = (int) ($input['table_id'] ?? 0);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $time) || $party < 1 || $tableId < 1) json_response(['error' => 'Date, time, party size, and table are required.'], 422);
    if ($date < date('Y-m-d')) json_response(['error' => 'Reservations cannot be made for a past date.'], 422);
    $pdo = db(); $pdo->beginTransaction();
    $tableStatement = $pdo->prepare('SELECT * FROM tables WHERE id = ? AND is_active = 1 FOR UPDATE'); $tableStatement->execute([$tableId]); $table = $tableStatement->fetch();
    if (!$table || (int) $table['capacity'] < $party) throw new RuntimeException('This table cannot accommodate the selected party size.');
    $slot = $pdo->prepare("SELECT id FROM reservations WHERE table_id = ? AND reservation_date = ? AND reservation_time = ? AND status IN ('Pending', 'Confirmed') FOR UPDATE"); $slot->execute([$tableId, $date, $time]);
    if ($slot->fetch()) throw new RuntimeException('That table was just reserved. Choose another table.');
    $insert = $pdo->prepare("INSERT INTO reservations (user_id, table_id, reservation_date, reservation_time, party_size, status, notes) VALUES (?, ?, ?, ?, ?, 'Pending', ?)"); $insert->execute([$user['id'], $tableId, $date, $time, $party, trim((string) ($input['notes'] ?? ''))]); $reservationId = (int) $pdo->lastInsertId();
    $addon = $pdo->prepare('SELECT id, price, stock_quantity, is_available FROM menu_items WHERE id = ? FOR UPDATE'); $addonInsert = $pdo->prepare('INSERT INTO reservation_add_ons (reservation_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)'); $stockUpdate = $pdo->prepare('UPDATE menu_items SET stock_quantity = stock_quantity - ?, is_available = IF(stock_quantity - ? <= 0, 0, is_available) WHERE id = ?'); $addons = $input['add_ons'] ?? [];
    if (is_array($addons)) foreach ($addons as $entry) { $addon->execute([(int) ($entry['menu_item_id'] ?? 0)]); $item = $addon->fetch(); $quantity = (int) ($entry['quantity'] ?? 0); if (!$item || !$item['is_available'] || $quantity < 1 || (int) $item['stock_quantity'] < $quantity) throw new RuntimeException('A selected add-on is unavailable or out of stock.'); $addonInsert->execute([$reservationId, $item['id'], $quantity, $item['price']]); $stockUpdate->execute([$quantity, $quantity, $item['id']]); }
    $pdo->commit(); json_response(['reservation' => ['id' => $reservationId, 'status' => 'Pending', 'table_number' => $table['table_number']]], 201);
} catch (InvalidArgumentException|RuntimeException $error) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); json_response(['error' => $error->getMessage()], 409); } catch (Throwable $error) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); handle_api_error($error); }
