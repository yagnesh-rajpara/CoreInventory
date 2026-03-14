# CoreInventory

A production-ready full-stack **Inventory Management System** with an ERP-style dashboard.

## Tech Stack

| Layer      | Technologies                                           |
|------------|-------------------------------------------------------|
| Frontend   | React, Vite, TypeScript, TailwindCSS, ShadCN UI, TanStack Table/Query, Zustand |
| Backend    | Python FastAPI, SQLAlchemy ORM, Pydantic, JWT Auth     |
| Database   | PostgreSQL 16                                          |
| Infra      | Docker, Docker Compose, Alembic Migrations             |

## Quick Start

```bash
# Clone and start
cd coreinventory
docker-compose up --build
```

| Service   | URL                            |
|-----------|-------------------------------|
| Frontend  | http://localhost:3000          |
| Backend   | http://localhost:8000/docs     |
| Database  | localhost:5432                 |

## Demo Credentials

| Role              | Email                       | Password  |
|-------------------|-----------------------------|-----------|
| Inventory Manager | admin@coreinventory.com     | admin123  |
| Warehouse Staff   | staff@coreinventory.com     | staff123  |

## Features

- **Dashboard** — KPI cards, recent activity, quick actions
- **Products** — CRUD, search, filters, stock per location
- **Warehouses** — warehouses + locations management
- **Receipts** — incoming goods with validation (auto stock increase)
- **Deliveries** — outgoing orders with validation (auto stock decrease)
- **Internal Transfers** — move stock between locations
- **Stock Adjustments** — correct recorded vs actual quantities
- **Move History** — complete stock ledger with filters
- **Auth** — signup, login, JWT, OTP password reset, role-based access
- **Dark Mode** — toggle between light/dark themes

## Project Structure

```
coreinventory/
├── frontend/          # React + Vite + TypeScript
│   └── src/
│       ├── components/   # Layout, Sidebar, Topbar
│       ├── pages/        # All feature pages
│       ├── store/        # Zustand stores
│       ├── lib/          # API client, utilities
│       └── types/        # TypeScript interfaces
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── routers/      # API routes
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── core/         # Config, security, exceptions
│   ├── alembic/          # Database migrations
│   └── seed.py           # Sample data
├── docker/            # Dockerfiles
├── docker-compose.yml
└── .env
```

## API Endpoints

| Route               | Description              |
|---------------------|--------------------------|
| `/api/auth/*`       | Authentication           |
| `/api/products/*`   | Product management       |
| `/api/warehouses/*` | Warehouses & locations   |
| `/api/operations/*` | Receipts, deliveries, transfers, adjustments |
| `/api/moves`        | Stock move history       |
| `/api/dashboard`    | Dashboard KPIs           |

## Business Logic

All stock changes go through the `stock_moves` ledger:
- **Receipt validated** → stock increases at destination location
- **Delivery validated** → stock decreases at source location
- **Transfer validated** → stock moves between locations (total unchanged)
- **Adjustment created** → stock corrected at location
