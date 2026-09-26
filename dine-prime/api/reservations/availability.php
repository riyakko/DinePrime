<?php
require_once __DIR__ . '/../db.php';
try {
    require_method('GET');
    $date = trim((string) ($_GET['date'] ?? '')); $time = trim((string) ($_GET['time'] ?? '')); $partySize = max(1, (int) ($_GET['party_size'] ?? 2));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $time)) json_response(['error' => 'A valid date and time are required.'], 422);
    $statement = db()->prepare("SELECT t.id, t.table_number, t.capacity, t.location_description, t.is_active, CASE WHEN r.id IS NULL THEN 'Available' ELSE 'Reserved' END AS status FROM tables t LEFT JOIN reservations r ON r.table_id = t.id AND r.reservation_date = ? AND r.reservation_time = ? AND r.status IN ('Pending', 'Confirmed') WHERE t.is_active = 1 ORDER BY t.id");
    $statement->execute([$date, $time]); $tables = $statement->fetchAll();
    foreach ($tables as &$table) { $table['capacity'] = (int) $table['capacity']; $table['eligible'] = $table['capacity'] >= $partySize; }
    json_response(['tables' => $tables]);
} catch (Throwable $error) { handle_api_error($error); }
