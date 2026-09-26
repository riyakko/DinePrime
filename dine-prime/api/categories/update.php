<?php
require_once __DIR__ . '/../db.php';
try { require_method('PUT'); require_auth(['staff', 'admin']); $id = validate_id(); $input = body(); $statement = db()->prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?'); $statement->execute([trim((string) ($input['name'] ?? '')), trim((string) ($input['description'] ?? '')), $id]); json_response(['ok' => true]); } catch (Throwable $error) { handle_api_error($error); }
