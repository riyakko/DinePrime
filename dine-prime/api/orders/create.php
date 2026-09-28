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
    $duplicateCheck = $pdo->prepare("
        SELECT id FROM orders 
        WHERE user_id = ? 
          AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) 
          AND status = 'Pending' 
        LIMIT 1 FOR UPDATE
    ");
    $duplicateCheck->execute([$user['id']]);
    if ($duplicateCheck->fetch()) {
        $pdo->rollBack();
        json_response([
            'status' => 'error',
            'message' => 'You have a recent pending order. Please wait 2 minutes before placing another.'
        ], 409);
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
        $item = $lock->fetch(PDO::FETCH_ASSOC);

        if (!$item || !(bool) $item['is_available'] || (int) $item['stock_quantity'] < $quantity) {
            throw new RuntimeException("Item ID {$id} is unavailable or out of stock.");
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

    // Normalize order type matching exact MySQL ENUM casing
    $rawOrderType = strtolower(trim((string) ($input['order_type'] ?? 'takeout')));
    if (str_contains($rawOrderType, 'dine')) {
        $orderType = 'Dine-In';
    } elseif (str_contains($rawOrderType, 'walk')) {
        $orderType = 'Walk-In';
    } elseif (str_contains($rawOrderType, 'res')) {
        $orderType = 'Reservation';
    } else {
        $orderType = 'Takeout';
    }

    // Sanitize Table ID
    $tableId = isset($input['table_id']) && $input['table_id'] !== '' && $input['table_id'] !== null
        ? (int) $input['table_id'] 
        : null;

    // Force Takeout to have null table_id
    if ($orderType === 'Takeout') {
        $tableId = null;
    }

    // Validate table selection requirement for Dine-In
    if ($orderType === 'Dine-In' && $tableId === null) {
        throw new InvalidArgumentException('Please select a valid table for Dine-In orders.');
    }

    // 3. Table verification logic
    if ($tableId !== null) {
        $tableCheck = $pdo->prepare("SELECT id FROM tables WHERE id = ? AND is_active = 1 FOR UPDATE");
        $tableCheck->execute([$tableId]);
        if (!$tableCheck->fetch()) {
            throw new RuntimeException('The selected table is unavailable or invalid.');
        }
    } elseif ($orderType === 'Walk-In') {
        $tableStmt = $pdo->prepare("
            SELECT t.id 
            FROM tables t 
            LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('Pending', 'Confirmed', 'Preparing', 'Ready') 
            WHERE t.is_active = 1 AND o.id IS NULL 
            ORDER BY t.id ASC LIMIT 1 FOR UPDATE
        ");
        $tableStmt->execute();
        $table = $tableStmt->fetch(PDO::FETCH_ASSOC);
        if (!$table) {
            throw new RuntimeException('No available tables for walk-in order.');
        }
        $tableId = (int) $table['id'];
    }

    // 4. Insert order record explicitly setting table_id and order_type
    $order = $pdo->prepare("
        INSERT INTO orders (user_id, table_id, order_type, total_amount, status, notes, created_at, updated_at) 
        VALUES (?, ?, ?, ?, 'Pending', ?, NOW(), NOW())
    ");
    $order->execute([
        $user['id'], 
        $tableId, 
        $orderType, 
        $total, 
        trim((string) ($input['notes'] ?? ''))
    ]);

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

    // Read incoming raw order type supporting multiple potential key aliases
$rawOrderType = strtolower(trim((string) (
    $input['order_type'] 
    ?? $input['dining_option'] 
    ?? $input['diningOption'] 
    ?? $input['type'] 
    ?? 'dine-in'
)));

if (str_contains($rawOrderType, 'dine')) {
    $orderType = 'Dine-In';
} elseif (str_contains($rawOrderType, 'walk')) {
    $orderType = 'Walk-In';
} elseif (str_contains($rawOrderType, 'res')) {
    $orderType = 'Reservation';
} else {
    $orderType = 'Takeout';
}

// Read incoming table ID supporting multiple potential key aliases
$rawTableId = $input['table_id'] ?? $input['tableId'] ?? $input['table_number'] ?? null;

$tableId = ($rawTableId !== '' && $rawTableId !== null) 
    ? (int) $rawTableId 
    : null;

    json_response([
        'order' => [
            'id' => $orderId,
            'table_id' => $tableId,
            'order_type' => $orderType,
            'total_amount' => $total,
            'status' => 'Pending'
        ]
    ], 201);

} catch (InvalidArgumentException | RuntimeException $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response(['status' => 'error', 'message' => $error->getMessage()], 409);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response([
        'status' => 'error',
        'message' => $error->getMessage(),
        'file' => $error->getFile(),
        'line' => $error->getLine()
    ], 500);
}