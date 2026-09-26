# Dine Prime

Dine Prime is a React static build backed by a PHP REST API and MySQL/MariaDB. Node is used only for the frontend build toolchain; it is not required on InfinityFree.

## Local development

1. Import [database.sql](database.sql) into MySQL/phpMyAdmin.
2. Configure the database constants in [api/db.php](api/db.php) for the local database if needed.
3. Start PHP from the project root: `php -S localhost:8000 -t .`.
4. Set `VITE_API_URL=http://localhost:8000/api` in `.env.local`.
5. Run `npm run dev`.

The seeded accounts use `Password123!`:

- `admin@example.com`
- `staff@example.com`
- `customer@example.com`

## InfinityFree deployment

1. Create/import the `if0_43006599_dineprime` database with [database.sql](database.sql).
2. Upload the contents of `dist/`, `api/`, and the root `.htaccess` to `htdocs`.
3. Keep `VITE_API_URL=/api` for same-origin API requests.
4. Ensure the PHP API files are uploaded with their directory structure intact.

The PHP API uses PDO prepared statements, PHP sessions, bcrypt passwords, server-side role checks, and transactional stock validation for orders.
