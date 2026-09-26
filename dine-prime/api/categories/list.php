<?php
require_once __DIR__ . '/../db.php';
try { require_method('GET'); json_response(['categories' => db()->query('SELECT * FROM categories ORDER BY name')->fetchAll()]); } catch (Throwable $error) { handle_api_error($error); }
