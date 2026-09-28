<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../db.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $orderId = $input['order_id'] ?? null;
    $provider = $input['provider'] ?? 'E-Wallet'; // e.g., 'GCash', 'Maya'

    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID is required.']);
        exit();
    }

    $pdo = function_exists('db') ? db() : $pdo;
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found.']);
        exit();
    }

    // In production: Call your payment gateway API (e.g., PayMongo/Xendit) here.
    // For local dev/testing: Generate dynamic placeholder QR code data or SVG
    $amountFormatted = number_format($order['total_amount'], 2, '.', '');
    $qrPayload = urlencode("DinePrime-Order-{$orderId}-USD-{$amountFormatted}");
    
    // Uses Google Chart API / QR Server for dynamic QR image generation
    $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={$qrPayload}";

    echo json_encode([
        'success' => true,
        'order_id' => $orderId,
        'amount' => $order['total_amount'],
        'provider' => $provider,
        'qr_code_url' => $qrImageUrl,
        'expires_in_seconds' => 600 // 10 minute expiry
    ]);

} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()]);
    exit();
}