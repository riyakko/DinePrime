<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('POST'); require_auth(['staff', 'admin']); $input = body();
    $required = ['category_id', 'name', 'description', 'price', 'image_url', 'stock_quantity'];
    foreach ($required as $field) if (!isset($input[$field]) || $input[$field] === '') json_response(['error' => "$field is required."], 422);
    $statement = db()->prepare('INSERT INTO menu_items (category_id, name, description, allergen_tags, price, image_url, stock_quantity, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $available = !empty($input['is_available']) && (int) $input['stock_quantity'] > 0 ? 1 : 0;
    $statement->execute([(int) $input['category_id'], trim($input['name']), trim($input['description']), trim((string) ($input['allergen_tags'] ?? '')), (float) $input['price'], trim($input['image_url']), max(0, (int) $input['stock_quantity']), $available]);
    json_response(['id' => (int) db()->lastInsertId()], 201);
} catch (Throwable $error) { handle_api_error($error); }
