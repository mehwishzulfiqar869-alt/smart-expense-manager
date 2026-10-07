# Smart Expense Manager

A full-stack expense and finance tracking application with role-based access.
Users can record income and expenses, scan receipts, split costs in groups, track inventory, and view reports.

Built as my Final Year Project for BSCS at the University of the Punjab.

## Features

- **Role-based access:** separate dashboards for Admin, Employee and Member
- **Expense management:** add, edit, categorize and review income and expenses
- **Admin review:** admins can review and manage submitted expenses
- **Receipt scanner (OCR):** extract expense details from receipt images
- **Split expenses:** create groups, add members, split costs and settle up
- **Inventory:** track assets and stock
- **Reports:** financial summaries and insights
- **User management:** admin tools to manage users
- **Secure authentication:** login with protected RESTful APIs

## Tech Stack | MERN |

| Layer | Technologies |
| --- | --- |
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | Token-based authentication with middleware |

## Project Structure

```
fyp1/
├── backend/             # Express API (routes, controllers, models, middleware)
├── finance-frontend/    # React application
└── expensedb.sql        # Database schema
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/mehwishzulfiqar869-alt/REPO-NAME.git
cd REPO-NAME
```

### 2. Set up the database

1. Create a new PostgreSQL database (for example `expensedb`).
2. Import the schema:

```bash
psql -U postgres -d expensedb -f expensedb.sql
```

### 3. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=expensedb
JWT_SECRET=your_secret_key
PORT=5000
```

Start the server:

```bash
node server.js
```

### 4. Set up the frontend

Open a new terminal:

```bash
cd finance-frontend
npm install
npm start
```

The app runs at `http://localhost:3000`.

## Screenshots

Add screenshots here (login page, dashboard, expense list, split groups, reports).

## Author

**Mehwish Zulfiqar**
**BSCS, University of the Punjab**
[LinkedIn](https://linkedin.com/in/mehwish-zulfiqar-0ab338355) · mehwishzulfiqar869@gmail.com
