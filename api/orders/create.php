<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

// Bypass table checks for takeout
if (strtolower($data['order_type']) === 'takeout') {
  $table_id = null;
  // Skip validation logic entirely
} else {
  // Validate table existence and status for dine-in
  if (!$tableExists || $tableStatus !== 'available') {
    http_response_code(409);
    echo json_encode(['error' => 'Table is occupied or invalid']);
    exit;
  }
  $table_id = $data['table_id'] ?? null;
}

// Force table_id to null for takeout in DB insert
if (strtolower($data['order_type']) === 'takeout') {
  $table_id = null;
}

// Proceed with order creation...
$order = [
  'order_type' => $data['order_type'],
  'table_id' => $table_id,
  // other fields...
];

echo json_encode(['success' => true, 'order' => $order]);
