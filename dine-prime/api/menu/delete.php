<?php
require_once __DIR__ . '/../db.php';
try {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST'], true)) json_response(['error' => 'Method not allowed.'], 405); require_auth(['staff', 'admin']); $id = validate_id();
    $statement = db()->prepare('DELETE FROM menu_items WHERE id = ?'); $statement->execute([$id]);
    json_response(['ok' => true]);
} catch (PDOException $error) {
    if ((int) $error->errorInfo[1] === 1451) json_response(['error' => 'This menu item is referenced by an order and cannot be deleted.'], 409);
    handle_api_error($error);
} catch (Throwable $error) { handle_api_error($error); }
