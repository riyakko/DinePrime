# Dine Prime 🍽️

A modern, full-stack restaurant reservation and online ordering application built with **React (Vite)** and **PHP (MySQL)**. Dine Prime provides a seamless experience for customers to view the menu, place orders, reserve tables with visual floor maps, and manage their profiles, alongside an intuitive admin/staff workflow for real-time kitchen display and management.

---

## ✨ Key Features

### 👤 Customer Experience
* **Interactive Table Reservations:** Visual floor plan map with real-time availability checks and customizable seating choices.
* **Online Menu & Ordering:** Filterable menu items by category with search functionality and item customization.
* **Account Dashboard:** Tabbed user account interface for profile management, order history, and active reservation tracking with automatic data polling.
* **Authentication:** Secure user signup, login, and session persistence.

### 🧑‍🍳 Staff & Admin Dashboard
* **Kitchen Display System (KDS):** Real-time order status updates and kitchen workflow tracking.
* **Reservation & Table Management:** Staff controls to handle customer seating, updates, and availability.
* **Menu & Category Management:** Dynamic CRUD controls for updating menu offerings, pricing, and stock status.
* **Analytics & Insights:** Business reporting on orders, revenue, and popular menu items.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, CSS3
* **Backend:** PHP (RESTful API endpoints)
* **Database:** MySQL
* **Web Server:** Apache / Nginx
* **Version Control:** Git & GitHub

---

## 📁 Repository Structure

```text
DinePrime/
├── api/                     # Backend PHP REST API
│   ├── admin/               # Admin & analytics endpoints
│   ├── auth/                # Login, register, logout, session, profile updates
│   ├── categories/          # Category CRUD endpoints
│   ├── menu/                # Menu item CRUD endpoints
│   ├── orders/              # Order placement and tracking endpoints
│   ├── reservations/        # Table availability and reservation endpoints
│   ├── tables/              # Table layout management
│   ├── db.php               # Database connection context
│   └── .htaccess            # Apache rewrite rules
├── src/                     # Frontend React Source Code
│   ├── api/                 # Fetch / Axios API abstraction helpers
│   ├── components/          # Reusable components & staff/admin modules
│   │   └── staff/           # KDS, Analytics, and MenuItem modal components
│   ├── context/             # Auth Context providers
│   ├── hooks/               # Custom React hooks (e.g., useAuth)
│   ├── App.jsx              # Main React Application Routing & State
│   ├── App.css              # Application Layout & Visual Styles
│   └── main.jsx             # React DOM entrypoint
├── database.sql             # SQL schema import file
├── package.json             # NPM dependencies & build scripts
└── vite.config.js           # Vite development server settings
