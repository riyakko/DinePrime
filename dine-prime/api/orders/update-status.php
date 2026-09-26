<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('PUT'); require_auth(['staff', 'admin']); $id = validate_id(); $input = body(); $status = (string) ($input['status'] ?? '');
    $allowed = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!in_array($status, $allowed, true)) json_response(['error' => 'Invalid order status.'], 422);
    
    $pdo = db();
    $pdo->beginTransaction();
    
    $orderStmt = $pdo->prepare('SELECT status FROM orders WHERE id = ? FOR UPDATE');
    $orderStmt->execute([$id]);
    $currentOrder = $orderStmt->fetch();
    if (!$currentOrder) {
        $pdo->rollBack();
        json_response(['error' => 'Order not found.'], 404);
    }
    
    $orderStmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
    $orderStmt->execute([$status, $id]);
    
    if ($status === 'Preparing' && $currentOrder['status'] !== 'Preparing') {
        $itemsStmt = $pdo->prepare('SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?');
        $itemsStmt->execute([$id]);
        $orderItems = $itemsStmt->fetchAll();
        
        $stockUpdate = $pdo->prepare('UPDATE menu_items SET stock_quantity = stock_quantity - ?, is_available = IF(stock_quantity - ? <= 0, 0, is_available) WHERE id = ?');
        foreach ($orderItems as $item) {
            $stockUpdate->execute([$item['quantity'], $item['quantity'], $item['menu_item_id']]);
        }
    }
    
    $pdo->commit();
    json_response(['ok' => true]);
} catch (Throwable $error) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); handle_api_error($error); }
