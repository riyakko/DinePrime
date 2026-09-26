<?php
require_once __DIR__ . '/../db.php';

try {
    require_method('POST');
    $user = require_auth(['customer']);
    $input = body();
    $items = $input['items'] ?? [];

    if (!is_array($items) || empty($items)) {
        json_response(['error' => 'At least one item is required.'], 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    $total = 0;
    $validated = [];

    // 1. Check duplicate recent pending order
    $duplicateCheck = $pdo->prepare("SELECT id FROM orders WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) AND status = 'Pending' LIMIT 1 FOR UPDATE");
    $duplicateCheck->execute([$user['id']]);
    if ($duplicateCheck->fetch()) {
        $pdo->rollBack();
        json_response(['error' => 'You have a recent pending order. Please wait before placing another order.'], 409);
    }

    // 2. Validate menu items and stock
    $lock = $pdo->prepare('SELECT id, name, price, stock_quantity, is_available FROM menu_items WHERE id = ? FOR UPDATE');
    foreach ($items as $entry) {
        $id = (int) ($entry['menu_item_id'] ?? $entry['id'] ?? 0);
        $quantity = (int) ($entry['quantity'] ?? 0);
        $instructions = trim((string) ($entry['special_instructions'] ?? ''));

        if ($id < 1 || $quantity < 1) {
            throw new InvalidArgumentException('Each item needs a valid quantity.');
        }

        $lock->execute([$id]);
        $item = $lock->fetch();

        if (!$item || !(bool) $item['is_available'] || (int) $item['stock_quantity'] < $quantity) {
            throw new RuntimeException('One or more selected items are unavailable or out of stock.');
        }

        $subtotal = (float) $item['price'] * $quantity;
        $total += $subtotal;
        $validated[] = [
            'item' => $item,
            'quantity' => $quantity,
            'subtotal' => $subtotal,
            'instructions' => $instructions
        ];
    }

    // Normalize order type
    $orderType = (string) ($input['order_type'] ?? 'Takeout');
    $tableId = isset($input['table_id']) && $input['table_id'] !== null ? (int) $input['table_id'] : null;

    // Check table and order_type columns presence dynamically
    $hasTableColumns = false;
    $hasOrderTypeColumn = false;
    try {
        $hasTableColumns = $pdo->query("SHOW COLUMNS FROM orders LIKE 'table_id'")->fetch() !== false;
        $hasOrderTypeColumn = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_type'")->fetch() !== false;
    } catch (Throwable $e) {
        $hasTableColumns = false;
        $hasOrderTypeColumn = false;
    }

    // 3. Table verification logic ONLY for table-based orders
    if ($hasTableColumns && in_array($orderType, ['Reservation', 'Walk-In', 'Dine-In'], true)) {
        if ($orderType === 'Walk-In' && $tableId === null) {
            $tableStmt = $pdo->prepare("SELECT t.id FROM tables t LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('Pending', 'Confirmed', 'Preparing', 'Ready') WHERE t.is_active = 1 AND o.id IS NULL ORDER BY t.id ASC LIMIT 1 FOR UPDATE");
            $tableStmt->execute();
            $table = $tableStmt->fetch();
            if (!$table) throw new RuntimeException('No available tables for walk-in order.');
            $tableId = (int) $table['id'];
        } elseif ($tableId !== null) {
            $tableCheck = $pdo->prepare("SELECT t.id FROM tables t LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('Pending', 'Confirmed', 'Preparing', 'Ready') WHERE t.id = ? AND t.is_active = 1 AND o.id IS NULL FOR UPDATE");
            $tableCheck->execute([$tableId]);
            if (!$tableCheck->fetch()) throw new RuntimeException('The selected table is unavailable or already occupied.');
        }
    } else {
        // Clear tableId if order is Takeout
        $tableId = null;
    }

    // 4. Insert order record based on available columns
    if ($hasTableColumns && $hasOrderTypeColumn) {
        $order = $pdo->prepare("INSERT INTO orders (user_id, table_id, order_type, total_amount, status, notes) VALUES (?, ?, ?, ?, 'Pending', ?)");
        $order->execute([$user['id'], $tableId, $orderType, $total, trim((string) ($input['notes'] ?? ''))]);
    } elseif ($hasTableColumns) {
        $order = $pdo->prepare("INSERT INTO orders (user_id, table_id, total_amount, status, notes) VALUES (?, ?, ?, 'Pending', ?)");
        $order->execute([$user['id'], $tableId, $total, trim((string) ($input['notes'] ?? ''))]);
    } else {
        $order = $pdo->prepare("INSERT INTO orders (user_id, total_amount, status, notes) VALUES (?, ?, 'Pending', ?)");
        $order->execute([$user['id'], $total, trim((string) ($input['notes'] ?? ''))]);
    }

    $orderId = (int) $pdo->lastInsertId();

    // 5. Insert order items & update inventory
    $itemInsert = $pdo->prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions) VALUES (?, ?, ?, ?, ?, ?)');
    $stockUpdate = $pdo->prepare('UPDATE menu_items SET stock_quantity = stock_quantity - ?, is_available = IF(stock_quantity - ? <= 0, 0, is_available) WHERE id = ?');

    foreach ($validated as $v) {
        $item = $v['item'];
        $qty = $v['quantity'];
        $itemInsert->execute([$orderId, $item['id'], $qty, $item['price'], $v['subtotal'], $v['instructions']]);
        $stockUpdate->execute([$qty, $qty, $item['id']]);
    }

    $pdo->commit();

    $responseData = ['order' => ['id' => $orderId, 'total_amount' => $total, 'status' => 'Pending']];
    if ($hasTableColumns) {
        $responseData['order']['table_id'] = $tableId;
    }
    if ($hasOrderTypeColumn) {
        $responseData['order']['order_type'] = $orderType;
    }

    json_response($responseData, 201);

} catch (InvalidArgumentException|RuntimeException $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response(['status' => 'error', 'message' => $error->getMessage()], 409);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response(['status' => 'error', 'message' => $error->getMessage()], 500);
}