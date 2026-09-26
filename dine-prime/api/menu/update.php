<?php
require_once __DIR__ . '/../db.php';
try {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'], true)) json_response(['error' => 'Method not allowed.'], 405); require_auth(['staff', 'admin']); $id = validate_id(); $input = body();
    $fields = ['category_id', 'name', 'description', 'allergen_tags', 'price', 'image_url', 'stock_quantity', 'is_available']; $sets = []; $values = [];
    foreach ($fields as $field) if (array_key_exists($field, $input)) { $sets[] = "$field = ?"; $values[] = $field === 'is_available' ? (int) (bool) $input[$field] : $input[$field]; }
    if (!$sets) json_response(['error' => 'No fields to update.'], 422);
    $values[] = $id; $statement = db()->prepare('UPDATE menu_items SET ' . implode(', ', $sets) . ' WHERE id = ?'); $statement->execute($values);
    json_response(['ok' => true]);
} catch (Throwable $error) { handle_api_error($error); }
