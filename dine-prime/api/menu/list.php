<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('GET');
    $sql = 'SELECT m.id, m.category_id, c.name AS category, m.name, m.description, m.allergen_tags, m.price, m.image_url, m.stock_quantity, m.is_available, m.created_at, m.updated_at FROM menu_items m JOIN categories c ON c.id = m.category_id WHERE 1=1';
    $params = [];
    if (!empty($_GET['category_id'])) { $sql .= ' AND m.category_id = ?'; $params[] = (int) $_GET['category_id']; }
    if (!empty($_GET['search'])) { $sql .= ' AND (m.name LIKE ? OR m.description LIKE ? OR c.name LIKE ?)'; $search = '%' . trim((string) $_GET['search']) . '%'; $params = array_merge($params, [$search, $search, $search]); }
    $sql .= ' ORDER BY m.created_at DESC';
    $statement = db()->prepare($sql); $statement->execute($params);
    json_response(['items' => $statement->fetchAll()]);
} catch (Throwable $error) { handle_api_error($error); }
