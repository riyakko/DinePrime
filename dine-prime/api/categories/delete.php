<?php
require_once __DIR__ . '/../db.php';
try { require_method('DELETE'); require_auth(['staff', 'admin']); $id = validate_id(); db()->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]); json_response(['ok' => true]); } catch (PDOException $error) { if ((int) $error->errorInfo[1] === 1451) json_response(['error' => 'This category still has menu items.'], 409); handle_api_error($error); } catch (Throwable $error) { handle_api_error($error); }
