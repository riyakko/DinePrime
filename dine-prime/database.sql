CREATE DATABASE IF NOT EXISTS `if0_43006599_dineprime` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `if0_43006599_dineprime`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `reservation_add_ons`, `reservations`, `tables`, `order_items`, `orders`, `menu_items`, `categories`, `users`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(40) NULL,
  `address` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB;

CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `categories_name_unique` (`name`)
) ENGINE=InnoDB;

CREATE TABLE `menu_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `allergen_tags` VARCHAR(500) NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `stock_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `menu_category_idx` (`category_id`),
  CONSTRAINT `menu_category_fk` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `table_id` INT UNSIGNED NULL,
  `order_type` ENUM('Reservation', 'Walk-In') NOT NULL DEFAULT 'Reservation',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `orders_user_idx` (`user_id`), KEY `orders_table_idx` (`table_id`),
  CONSTRAINT `orders_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `orders_table_fk` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `menu_item_id` INT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `special_instructions` TEXT NULL,
  PRIMARY KEY (`id`), KEY `order_items_order_idx` (`order_id`), KEY `order_items_menu_idx` (`menu_item_id`),
  CONSTRAINT `order_items_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `order_items_menu_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE `tables` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_number` VARCHAR(20) NOT NULL,
  `capacity` INT UNSIGNED NOT NULL,
  `location_description` VARCHAR(100) NOT NULL DEFAULT 'Main Dining',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`), UNIQUE KEY `tables_number_unique` (`table_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `reservations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `table_id` INT UNSIGNED NOT NULL,
  `reservation_date` DATE NOT NULL,
  `reservation_time` TIME NOT NULL,
  `party_size` INT UNSIGNED NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `reservation_slot_idx` (`reservation_date`, `reservation_time`, `table_id`),
  CONSTRAINT `reservation_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservation_table_fk` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `reservation_add_ons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` INT UNSIGNED NOT NULL,
  `menu_item_id` INT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `addon_reservation_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `addon_menu_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES
('Dine Prime Admin', 'admin@example.com', '$2b$10$ALANMpa.J643cjzVet4IkezokOCcX7xOHfPhF.EGQq36zfnR6FVne', 'admin'),
('Dine Prime Staff', 'staff@example.com', '$2b$10$ALANMpa.J643cjzVet4IkezokOCcX7xOHfPhF.EGQq36zfnR6FVne', 'staff'),
('Jordan Lee', 'customer@example.com', '$2b$10$ALANMpa.J643cjzVet4IkezokOCcX7xOHfPhF.EGQq36zfnR6FVne', 'customer');

INSERT INTO `categories` (`name`, `description`) VALUES
('Burgers', 'House-ground burgers and considered accompaniments.'),
('Sides', 'Small plates for sharing.'),
('Beverages', 'Seasonal drinks, coffee, and house refreshments.'),
('Desserts', 'A sweet finish from the pastry kitchen.');

INSERT INTO `tables` (`table_number`, `capacity`, `location_description`) VALUES
('Table 01', 2, 'Window'), ('Table 02', 4, 'Main Hall'), ('Table 03', 2, 'Window'), ('Table 04', 4, 'Center Booth'), ('Table 05', 6, 'Garden Patio'), ('Table 06', 8, 'Private Dining Room');

INSERT INTO `menu_items` (`category_id`, `name`, `description`, `price`, `image_url`, `stock_quantity`, `is_available`) VALUES
(1, 'Prime House Burger', 'Dry-aged beef, aged cheddar, onion jam, and house sauce.', 18.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80', 24, 1),
(1, 'Crispy Chicken Burger', 'Buttermilk chicken, cabbage slaw, pickles, and mustard.', 16.00, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1000&q=80', 18, 1),
(1, 'Garden Burger', 'Roasted mushroom patty, herbs, tomato, and aioli.', 15.00, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1000&q=80', 12, 1),
(2, 'Truffle Fries', 'Crisp potatoes, parmesan, truffle salt, and chive.', 9.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1000&q=80', 30, 1),
(2, 'Charred Corn Ribs', 'Smoked paprika butter, lime, and cotija.', 10.00, 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1000&q=80', 14, 1),
(2, 'Green Salad', 'Market leaves, cucumber, herbs, and lemon vinaigrette.', 8.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80', 20, 1),
(3, 'House Lemonade', 'Fresh lemon, mint, and a touch of honey.', 6.00, 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f6d?auto=format&fit=crop&w=1000&q=80', 40, 1),
(3, 'Cold Brew', 'Slow-steeped coffee served over ice.', 6.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80', 22, 1),
(3, 'Ginger Spritz', 'Ginger, citrus, soda, and aromatic bitters.', 8.00, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80', 16, 1),
(4, 'Chocolate Tart', 'Dark chocolate ganache, sea salt, and creme fraiche.', 11.00, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80', 10, 1),
(4, 'Seasonal Fruit Pavlova', 'Crisp meringue, vanilla cream, and market fruit.', 12.00, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=80', 0, 0);

INSERT INTO `orders` (`user_id`, `total_amount`, `status`, `notes`) VALUES
(3, 42.00, 'Completed', 'Window table.'),
(3, 27.00, 'Preparing', 'No onions, please.');
INSERT INTO `order_items` (`order_id`, `menu_item_id`, `quantity`, `unit_price`, `subtotal`) VALUES
(1, 1, 1, 18.00, 18.00), (1, 4, 1, 9.00, 9.00), (1, 10, 1, 11.00, 11.00),
(2, 2, 1, 16.00, 16.00), (2, 5, 1, 10.00, 10.00), (2, 7, 1, 6.00, 6.00);
