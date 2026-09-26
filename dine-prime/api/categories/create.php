<?php
require_once __DIR__ . '/../db.php';
try { require_method('POST'); require_auth(['staff', 'admin']); $input = body(); $name = trim((string) ($input['name'] ?? '')); if ($name === '') json_response(['error' => 'Category name is required.'], 422); $statement = db()->prepare('INSERT INTO categories (name, description) VALUES (?, ?)'); $statement->execute([$name, trim((string) ($input['description'] ?? ''))]); json_response(['id' => (int) db()->lastInsertId()], 201); } catch (Throwable $error) { handle_api_error($error); }
