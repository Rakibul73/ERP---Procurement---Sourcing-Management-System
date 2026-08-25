# ERP - Procurement & Sourcing Management System

A production-grade desktop ERP application for supplier/product sourcing, quotations, tenders, and purchasing. Built as a **single Windows `.exe`** with Go backend (Wails v2) and React frontend. No database server, no runtime dependencies — just one file to run.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Build](#production-build)
- [Docker Build](#docker-build-optional)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database](#database)
- [AI Features](#ai-features)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### Core Modules

| Module | Description |
|--------|-------------|
| **Authentication & RBAC** | Argon2 password hashing, role-based access (admin, procurement_manager, buyer, viewer) |
| **Organization Profile** | Company settings, branding, contact info |
| **Supplier Management** | Full CRUD, contacts, notes, supplier-product relationships, pricing history |
| **Product Management** | Products with categories, supplier associations, pricing tiers |
| **Sourcing Requests** | Create RFQs, assign products, track status (draft → shortlisted → quoted → ordered) |
| **Tenders/RFQs** | Create tenders, add items, invite suppliers, track submissions |
| **Quotations** | Supplier quotes with line items, side-by-side comparison views |
| **Purchase Orders** | PO lifecycle (draft → confirmed → delivered), line items, linked quotations |
| **Customers** | Customer management with contacts, industry segments |
| **Communications** | Log emails, calls, meetings with suppliers/customers by entity |
| **Activity Log** | Full audit trail of user actions across the system |
| **CSV/Excel Import** | Bulk import suppliers, products with preview, validation, and column mapping |
| **Document Import** | Upload invoices/quotes → Vision LLM extracts structured data |
| **Global Search** | FTS5-powered search across suppliers, products, tenders, quotations, POs, customers |
| **Export** | CSV and Excel (XLSX) export for any entity with filtering |
| **Dashboard** | KPI cards, monthly spend chart, top suppliers, recent activity, pending POs |
| **Settings** | Organization profile, system info, Danger Zone (delete demo data) |

### UI Features

- Dark-themed professional admin dashboard
- Scrollable sidebar with independent content scrolling
- Quick-login demo buttons (Admin, Procurement Mgr, Buyer, Viewer)
- Reusable UI components (EmptyState, LoadingSpinner, PageHeader)
- Global ErrorBoundary for crash recovery
- Custom dark scrollbar styling

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.25+, Wails v2.15.0 |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Database** | SQLite (modernc.org/sqlite — pure Go, no CGO) |
| **Search** | SQLite FTS5 full-text search |
| **Auth** | Argon2id password hashing (golang.org/x/crypto) |
| **Export** | Excelize v2.11.0 (XLSX), encoding/csv (CSV) |
| **OCR/Extraction** | Vision LLM API (OpenAI / Gemini / Anthropic) |
| **Build** | Wails CLI, npm, Go compiler |

---

## Prerequisites

### For End Users (Running the `.exe`)

- **Windows 10 22H2+** or **Windows 11** (WebView2 runtime is built-in)
- Nothing else to install — just double-click `ERP.exe`

### For Development / Building

| Tool | Version | Purpose |
|------|---------|---------|
| **Go** | 1.25+ | Backend compilation |
| **Node.js** | 22+ | Frontend build |
| **npm** | 10+ | Package management |
| **Wails CLI** | v2.15.0 | Desktop app packaging |
| **Git** | Any | Source control |

Install Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Verify installation:

```bash
wails doctor
```

---

## Quick Start

### Option 1: Run the pre-built `.exe`

```bash
# Just run it — no build needed
./ERP.exe
```

The app will:
1. Create the database at `%APPDATA%/ERP/data.db` on first launch
2. Run all SQL migrations automatically
3. Seed demo data (12 suppliers, 15 products, 7 customers, etc.)
4. Open the login window

### Option 2: Build from source

```bash
# 1. Install frontend dependencies
cd erp/frontend && npm install

# 2. Build frontend
npm run build

# 3. Copy frontend dist to backend embed directory
# PowerShell:
Remove-Item -Recurse -Force ..\backend\frontend\dist -ErrorAction SilentlyContinue
Copy-Item dist ..\backend\frontend\dist -Recurse

# 4. Build the exe
cd ..\backend
$env:PATH += ";$env:GOPATH\bin"
wails build -ldflags "-s -w" -platform windows/amd64

# 5. Run
.\build\bin\ERP.exe
```

---

## Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd ERP
```

### 2. Install dependencies

```bash
# Frontend
cd erp/frontend && npm install

# Go modules (handled automatically by Wails)
cd ../backend && go mod download
```

### 3. Run in dev mode (hot-reload)

```bash
cd erp/backend
wails dev
```

This starts:
- Vite dev server on `http://localhost:5173` (hot-reload frontend)
- Wails dev window with WebView2 (frontend at localhost, Go backend live)

### 4. Frontend only (UI development)

```bash
cd erp/frontend
npm run dev
```

Opens `http://localhost:5173` — but Wails bindings (`window.go.main.App.*`) won't work without the backend.

---

## Production Build

### Build Command (single exe)

```powershell
# From project root
cd erp

# Build frontend
cd frontend
npm run build
cd ..

# Copy dist to backend
Remove-Item -Recurse -Force backend\frontend\dist -ErrorAction SilentlyContinue
Copy-Item frontend\dist backend\frontend\dist -Recurse

# Build exe
cd backend
$env:PATH += ";$env:GOPATH\bin"
wails build -ldflags "-s -w" -platform windows/amd64

# Result
# => build\bin\ERP.exe (~18 MB)
```

### Build Flags

| Flag | Purpose |
|------|---------|
| `-ldflags "-s -w"` | Strip debug symbols and DWARF tables (reduces binary size) |
| `-platform windows/amd64` | Target Windows x64 |
| `-clean` | Clean build cache before building |
| `-dev` | Build with devtools enabled |

### What the build does

1. **Frontend build**: `tsc -b && vite build` → `frontend/dist/` (HTML, CSS, JS)
2. **Embed**: Go's `//go:embed all:frontend/dist` directive bundles frontend into the Go binary
3. **Compile**: Go compiles everything into a single `.exe` with WebView2 loader
4. **Output**: `backend/build/bin/ERP.exe`

### Copy to project root

```powershell
Copy-Item erp\backend\build\bin\ERP.exe erp\ERP.exe -Force
```

---

## Docker Build (Optional)

Build `ERP.exe` entirely in Docker — no Go, Wails, or Node needed locally.

### Requirements

- Docker Desktop installed and running

### Build

```powershell
# From erp/ directory
docker build -t erp-builder -f build/Dockerfile .
docker create --name erp-tmp erp-builder
docker cp erp-tmp:/dist/ERP.exe ./dist/ERP.exe
docker rm erp-tmp
```

Output: `erp/dist/ERP.exe`

### How it works

1. **Stage 1** (`node:22`): Installs npm deps, runs `npm run build` → `frontend/dist/`
2. **Stage 2** (`golang:1.26`): Installs mingw-w64 cross-compiler + Wails CLI, copies Go source + built frontend, runs `wails build` → `build/bin/ERP.exe`
3. **Stage 3** (`scratch`): Copies only the final `.exe` to output

### Customizing

Edit `build/Dockerfile` to change Go version, Wails version, or build flags.

---

## Running the Application

### First Launch

1. Double-click `ERP.exe`
2. The app creates `%APPDATA%/ERP/data.db` automatically
3. All migrations run on startup
4. Demo data is seeded (suppliers, products, customers, etc.)
5. Login window appears

### Subsequent Launches

1. Double-click `ERP.exe`
2. Login with your credentials
3. Previous session data is preserved

### Database Location

```
%APPDATA%\ERP\data.db         # SQLite database
%APPDATA%\ERP\documents\      # Uploaded documents
%APPDATA%\ERP\exports\        # CSV/XLSX exports
```

### Logging Out

- Click your username in the top-right corner → Logout
- Session is cleared, login screen reappears

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@erp.local | admin123 |
| **Procurement Manager** | procurement@erp.local | proc123 |
| **Buyer** | buyer@erp.local | buyer123 |
| **Viewer** | viewer@erp.local | viewer123 |

Use the **quick-login buttons** on the login page for instant demo access.

### Role Permissions

| Role | Access |
|------|--------|
| Admin | Full access to all modules + user management |
| Procurement Manager | Sourcing, tenders, quotations, POs, suppliers, products |
| Buyer | View suppliers/products, create POs, view quotations |
| Viewer | Read-only access to all modules |

---

## Project Structure

```
ERP/
├── ERP.md                          # Full requirements specification
├── erp-build-prompt.md             # AI agent build instructions
│
└── erp/                            # Application root
    ├── DECISIONS.md                # Architectural decisions log
    ├── ERP.exe                     # Built executable
    │
    ├── backend/                    # Go backend (Wails)
    │   ├── main.go                 # Wails entrypoint (//go:embed)
    │   ├── app.go                  # App struct, startup, DB schema, migrations
    │   ├── auth.go                 # Authentication, user CRUD, RBAC
    │   ├── rbac.go                 # Role hierarchy, permission constants
    │   ├── seed.go                 # Demo data seeding + deletion
    │   ├── suppliers.go            # Supplier CRUD + contacts + notes
    │   ├── products.go             # Product CRUD + supplier-product M2M
    │   ├── sourcing.go             # Sourcing request management
    │   ├── tenders.go              # Tender/RFQ management
    │   ├── quotations.go           # Quotation CRUD + comparison
    │   ├── purchase_orders.go      # PO lifecycle management
    │   ├── customers.go            # Customer + contact CRUD
    │   ├── communications.go       # Communication log
    │   ├── analytics.go            # Dashboard analytics
    │   ├── search_export.go        # Global search + CSV/XLSX export
    │   ├── importer.go             # CSV/XLSX bulk import pipeline
    │   ├── extraction.go           # Vision-LLM document extraction
    │   ├── wails.json              # Wails CLI config
    │   ├── go.mod                  # Go module definition
    │   └── frontend/dist/          # Embedded frontend (built assets)
    │
    ├── frontend/                   # React + TypeScript + Vite
    │   ├── src/
    │   │   ├── main.tsx            # Root entry (ErrorBoundary + StrictMode)
    │   │   ├── App.tsx             # Page routing, sidebar layout
    │   │   ├── index.css           # Tailwind + custom scrollbar styles
    │   │   ├── types/
    │   │   │   └── wails.d.ts      # Global TypeScript declarations
    │   │   ├── components/
    │   │   │   ├── Sidebar.tsx     # Navigation sidebar
    │   │   │   ├── ErrorBoundary.tsx
    │   │   │   └── UI.tsx          # EmptyState, LoadingSpinner, PageHeader
    │   │   └── pages/
    │   │       ├── LoginPage.tsx           # Login + quick-login buttons
    │   │       ├── Dashboard.tsx           # KPIs, charts, recent activity
    │   │       ├── SuppliersPage.tsx       # Supplier list + detail + contacts
    │   │       ├── ProductsPage.tsx        # Product list + M2M relationships
    │   │       ├── SourcingPage.tsx        # Sourcing request lifecycle
    │   │       ├── TendersPage.tsx         # Tender/RFQ management
    │   │       ├── QuotationsPage.tsx      # Quotes + comparison view
    │   │       ├── PurchaseOrdersPage.tsx  # PO workflow
    │   │       ├── CustomersPage.tsx       # Customer management
    │   │       ├── CommunicationsPage.tsx  # Communication log
    │   │       ├── ImportPage.tsx          # CSV/Excel bulk import
    │   │       ├── DocumentImportPage.tsx  # Vision-LLM extraction
    │   │       ├── SearchPage.tsx          # Global search
    │   │       ├── ActivityLogPage.tsx     # Audit trail
    │   │       ├── UsersPage.tsx           # User management (admin)
    │   │       └── SettingsPage.tsx        # Org profile + system info + Danger Zone
    │   ├── package.json
    │   └── vite.config.ts
    │
    ├── build/
    │   └── Dockerfile              # Docker cross-compilation (optional)
    │
    └── migrations/                 # SQL migration files
```

---

## Architecture

### Single-Exe Design

```
┌─────────────────────────────────────────┐
│              ERP.exe (~18 MB)            │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Go Backend  │  │  React Frontend  │  │
│  │  (Wails v2)  │  │  (Vite bundle)   │  │
│  │             │  │                  │  │
│  │  SQLite     │  │  Tailwind CSS    │  │
│  │  FTS5       │  │  TypeScript      │  │
│  │  Argon2     │  │  16 pages        │  │
│  │  Excelize   │  │  Dark theme      │  │
│  └─────────────┘  └──────────────────┘  │
│                                         │
│  Embedded via //go:embed all:frontend/  │
└─────────────────────────────────────────┘
         │
         ▼
  %APPDATA%/ERP/data.db
```

### Communication Flow

```
User clicks button in React
        │
        ▼
window.go.main.App.MethodName(args)    ← Wails binding
        │
        ▼
Go method in app.go / auth.go / etc.
        │
        ▼
SQLite query (modernc.org/sqlite)
        │
        ▼
Result returned to React as JSON
```

### Key Design Decisions

1. **No HTTP router** — All frontend calls use `window.go.main.App.*` Wails bindings, not `fetch('/api/...')`
2. **Pure Go SQLite** — `modernc.org/sqlite` requires no CGO or external DLLs
3. **FTS5 for search** — Built into SQLite, no external search service
4. **Vision LLM for OCR** — Not Tesseract; configurable per-provider in Settings
5. **Wails v2** — Not v3 (not yet stable); provides native WebView2 window
6. **Auto-migrations** — Schema runs on every startup; idempotent

---

## Database

### Location

```
%APPDATA%\ERP\data.db
```

### Schema

28 tables covering:

| Category | Tables |
|----------|--------|
| **Users/Auth** | `users`, `activity_log` |
| **Organization** | `organizations` |
| **Suppliers** | `suppliers`, `supplier_contacts`, `supplier_notes`, `supplier_products`, `pricing_history` |
| **Products** | `products`, `product_categories` |
| **Sourcing** | `sourcing_requests`, `sourcing_request_products`, `supplier_shortlists` |
| **Tenders** | `tenders`, `tender_items`, `tender_suppliers` |
| **Quotations** | `quotations`, `quotation_line_items` |
| **Purchase Orders** | `purchase_orders`, `purchase_order_line_items` |
| **Customers** | `customers`, `customer_contacts` |
| **Communications** | `communications` |
| **Documents** | `documents`, `import_jobs` |
| **Config** | `system_config` |

### Migrations

- Run automatically on every app startup
- Idempotent (use `IF NOT EXISTS`, `IF EXISTS`)
- Managed in `app.go` → `runMigrations()`

### Seed Data

- Auto-seeded on first launch (empty database)
- 12 suppliers, 15 products, 7 customers, 18 communications, 43 activity log entries
- Users and organization preserved when deleting demo data

### Delete Demo Data

- Go to **Settings → Danger Zone → Delete All Demo Data**
- Removes all transactional data (suppliers, products, POs, etc.)
- Preserves user accounts and organization settings

---

## AI Features

### Vision-LLM Document Extraction

Upload invoices, quotes, or specifications → AI extracts structured data.

| Provider | Models | Use Case |
|----------|--------|----------|
| OpenAI | gpt-4o, gpt-4o-mini | Invoice/quote extraction |
| Google Gemini | gemini-2.0-flash | Multi-page documents |
| Anthropic | claude-3-haiku | Complex forms |

### Configuration

1. Open **Settings** page
2. Select AI provider
3. Enter API key
4. Select model
5. Save

### What works offline

Everything except document extraction. The app is fully functional without any API key.

---

## Configuration

### Environment Variables

None required. All configuration is through the Settings UI.

### Data Directory

```
%APPDATA%\ERP\
├── data.db              # SQLite database
├── documents\           # Uploaded files
└── exports\             # Generated CSV/XLSX files
```

### Build Configuration

| File | Purpose |
|------|---------|
| `backend/wails.json` | Wails CLI build config |
| `backend/go.mod` | Go dependencies |
| `frontend/package.json` | Frontend dependencies |
| `frontend/vite.config.ts` | Vite build config |
| `build/Dockerfile` | Docker cross-compilation (optional) |

---

## Troubleshooting

### Build fails with "wails: command not found"

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH="$PATH:$(go env GOPATH)/bin"
```

### Build fails with "too few values in struct literal"

Check `seed.go` — the struct literal field count must match the struct definition exactly.

### Frontend build succeeds but exe shows blank screen

Ensure frontend dist is copied before building:
```powershell
Remove-Item -Recurse -Force backend\frontend\dist -ErrorAction SilentlyContinue
Copy-Item frontend\dist backend\frontend\dist -Recurse
```

### Database not found / empty state

The database is created on first launch at `%APPDATA%/ERP/data.db`. If it's missing:
1. Close the app
2. Delete `%APPDATA%/ERP/` folder (if exists)
3. Re-launch — migrations and seeding will run fresh

### Scroll issues (sidebar and content scroll together)

Ensure `App.tsx` uses `h-screen overflow-hidden` on the outer container:
```tsx
<div className="h-screen bg-gray-900 flex overflow-hidden">
```

### Export fails

Exports are saved to `%APPDATA%/ERP/exports/`. Ensure the directory exists and is writable.

---

## License

Internal project. All rights reserved.
