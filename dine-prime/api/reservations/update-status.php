<?php
require_once __DIR__ . '/../db.php';
try { require_method('POST'); require_auth(['staff', 'admin']); $input = body(); $id = (int) ($input['id'] ?? 0); $status = (string) ($input['status'] ?? ''); if ($id < 1 || !in_array($status, ['Pending', 'Confirmed', 'Cancelled', 'Completed'], true)) json_response(['error' => 'A valid reservation and status are required.'], 422); db()->prepare('UPDATE reservations SET status = ? WHERE id = ?')->execute([$status, $id]); json_response(['ok' => true]); } catch (Throwable $error) { handle_api_error($error); }
