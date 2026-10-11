```markdown
# Dine Prime 🍽️

A modern, full-stack restaurant reservation and online ordering application built with **React (Vite)** and **PHP (MySQL)**. Dine Prime provides a seamless experience for customers to view the menu, place orders, choose dine-in or takeout preferences, settle bills through multi-channel payment options (Cash, Cards, and E-Wallets with dynamic QR code flows), and track real-time statuses alongside an intuitive staff kitchen display and management system.

---

## ✨ Key Features

### 👤 Customer Experience
- **Interactive Table Reservations & Seating:** Visual floor plan map with real-time availability checks and table selection for dine-in guests.
- **Dynamic Dining Preferences:** Seamless switching between **Dine-In** (with table tracking) and **Takeout** options.
- **Online Menu & Customization:** Filterable menu items by category with real-time search, stock limits, and special instructions per item.
- **Flexible Payment Gateway:** Secure checkout supporting **Cash at Counter/Table**, **Credit/Debit Cards**, and **E-Wallets** (GCash, PayPal, GoTyme Bank) complete with instant QR code generation and scanning flows.
- **Real-Time Order & Cart Management:** Automated state synchronization and persistence using `localStorage` and custom event dispatchers for instant cart cleanup upon successful payment.
- **Account & Order History:** Tabbed user interface for tracking active reservations, order history, and profile settings.

### 🧑‍🍳 Staff & Admin Dashboard
- **Kitchen Display System (KDS):** Real-time order queue tracking and status updates synchronized instantly via event emitters.
- **Reservation & Table Management:** Staff controls to monitor table availability, seating assignments, and customer reservations.
- **Menu & Category Management:** Dynamic CRUD controls for updating menu offerings, pricing, descriptions, and stock quantities.
- **Business Insights:** Comprehensive tracking for order volumes, status logs, and table workflows.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, CSS3, Modern ES6+ JavaScript SPA Architecture
- **Backend:** PHP (RESTful API endpoints with PDO)
- **Database:** MySQL
- **Web Server:** Apache / Nginx (`.htaccess` URL rewriting enabled)
- **Version Control:** Git & GitHub

---

## 📁 Repository Structure

```text
DinePrime/
├── api/                    # Backend PHP REST API
│   ├── admin/              # Admin & analytics endpoints
│   ├── auth/               # Login, register, logout, session, profile updates
│   ├── categories/         # Category CRUD endpoints
│   ├── menu/               # Menu item CRUD endpoints
│   ├── orders/             # Order placement, status updates, and tracking endpoints
│   ├── reservations/       # Table availability and reservation endpoints
│   ├── tables/             # Table layout management
│   ├── db.php              # Database connection context (PDO)
│   └── .htaccess           # Apache rewrite rules
├── src/                    # Frontend React Source Code
│   ├── api/                # Fetch / Axios API abstraction helpers
│   ├── assets/             # Images and static media assets
│   ├── components/         # Reusable components & staff/admin modules
│   │   └── staff/          # KDS (KitchenDisplay), Analytics, and management modals
│   ├── context/            # Auth Context providers
│   ├── hooks/              # Custom React hooks (e.g., useAuth)
│   ├── App.jsx             # Main React Application Routing, State & Views
│   ├── App.css             # Application Layout & Visual Styles
│   ├── Order.jsx           # Customer ordering and checkout workflow view
│   ├── EWalletQRModal.jsx  # E-Wallet payment QR generator modal
│   └── main.jsx            # React DOM entrypoint
├── database.sql            # SQL schema import file
├── package.json            # NPM dependencies & build scripts
└── vite.config.js          # Vite development server settings

```

---

## 🚀 Getting Started

### Prerequisites

* Node.js & npm installed
* Local PHP server environment (e.g., XAMPP, WAMP, or Laragon with Apache and MySQL)

### Installation & Setup

1. **Clone the Repository:**
```bash
git clone [https://github.com/your-username/DinePrime.git](https://github.com/your-username/DinePrime.git)
cd DinePrime

```


2. **Database Setup:**
* Import the `database.sql` file into your local MySQL database server.
* Update your database credentials inside `api/db.php`.


3. **Frontend Setup:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

```


4. **Production Build:**
```bash
npm run build

```



```

```