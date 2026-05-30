# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**POS System** for a small-to-medium sandwich & coffee shop. Features:
- Cashier-facing point-of-sale interface for taking orders and payments
- Admin panel for product management, reports, user management, and shift control
- Dynamic QR code payment generation (PromptPay)
- Manual payment confirmation flow
- Receipt printing
- Comprehensive audit logging and sales reporting

**Stack**: Node.js/Express backend (TypeScript), React frontend (Vite + TypeScript), SQLite database

---

## Getting Started

### Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Development

**Backend** (runs on `http://localhost:3001`):
```bash
cd backend
npm run dev          # Watch mode with tsx
npm run build        # Compile TypeScript
npm run start        # Run compiled server
npm run seed         # Seed database with initial data
```

**Frontend** (runs on `http://localhost:5173`):
```bash
cd frontend
npm run dev          # Vite dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build locally
```

### Database

The backend uses SQLite with `better-sqlite3`. The schema is defined in `backend/src/db/schema.ts`. Run seeding to initialize:
```bash
cd backend && npm run seed
```

---

## Architecture

### Monolith Structure

```
backend/
├── src/
│   ├── server.ts           # Express app setup
│   ├── db/
│   │   ├── schema.ts       # SQLite schema and DB init
│   │   └── seed.ts         # Initial data seeding
│   ├── middleware/
│   │   └── auth.ts         # JWT authentication
│   └── routes/
│       ├── auth.ts         # Login, logout, token refresh
│       ├── products.ts     # GET /products (public)
│       ├── orders.ts       # POST/GET orders, cancel order
│       ├── payments.ts     # QR generation, payment confirm
│       ├── print.ts        # Receipt rendering (HTML → print)
│       └── admin.ts        # All admin operations

frontend/
├── src/
│   ├── App.tsx             # Main router
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── POSPage.tsx     # Order creation & cart
│   │   ├── CheckoutPage.tsx
│   │   ├── QRPaymentPage.tsx
│   │   └── admin/          # Dashboard, Products, Users, Reports, etc.
│   ├── components/         # Reusable UI components
│   ├── lib/
│   │   ├── auth.tsx        # Auth context & ProtectedRoute
│   │   ├── cart.tsx        # Cart context
│   │   └── api.ts          # Fetch utilities
│   └── types/
│       └── index.ts        # TypeScript types
```

### Key Database Tables

- **users**: Cashier & Admin accounts (JWT tokens derived from `email`)
- **products**: Menu items (name, price, category, is_active, sort_order)
- **orders**: Order headers (status: PENDING|COMPLETED|CANCELLED|REFUNDED)
- **order_items**: Line items with **name_snapshot** and **price_snapshot** to preserve historical accuracy
- **payments**: Payment records (status: PENDING|SUCCESS|FAILED, method: CASH|QR, idempotency_key for duplicate protection)
- **discounts**: Applied discounts (type: PERCENT|FIXED, per order)
- **payment_methods** & **payment_configs**: Dynamic QR settings (PromptPay ID, account name, TTL)
- **settings**: System-wide config (SHOP_NAME, RECEIPT_FOOTER, QR_TIMEOUT_SECONDS, etc.)
- **shifts**: Shift open/close with cash in/out
- **cash_adjustments**: Cash drawer IN/OUT transactions with reason
- **audit_logs**: Action log (who did what, when, on which entity)

### Payment Flow

1. **Create Order** → `POST /api/orders` (status: PENDING)
2. **Select QR Payment** → `GET /api/payments/:orderId/qr`
   - Backend checks if order exists, creates `payments` record (PENDING)
   - Generates dynamic QR using `promptpay-qr` library
   - Returns QR image, amount, reference code
3. **Customer Pays** → Uses mobile banking app
4. **Confirm Payment** → `POST /api/payments/:id/confirm`
   - Must use **transaction**: update payment to SUCCESS + update order to COMPLETED atomically
   - Idempotency key prevents duplicate confirms
   - Returns success response
5. **Print Receipt** → `GET /api/orders/:id/receipt` returns HTML, frontend prints

### Discount & Totals

- `order.total_amount` = sum of item prices (before discount)
- `order.discount_amount` = discount value
- `order.net_amount` = `total_amount - discount_amount`
- Discount snapshot stored in `discounts` table for audit

---

## Design System

Uses **Linear Design System** (dark-mode-first):
- **Background**: `#08090a` (marketing), `#0f1011` (panels), `#191a1b` (elevated surfaces)
- **Text**: `#f7f8f8` (primary), `#d0d6e0` (secondary), `#8a8f98` (tertiary)
- **Brand Accent**: Indigo-violet (`#5e6ad2` bg, `#7170ff` interactive, `#828fff` hover)
- **Borders**: Ultra-thin semi-transparent white (`rgba(255,255,255,0.05)` to `0.08`)
- **Typography**: Inter Variable (weights 300–590) with OpenType features `cv01, ss03`
- **Display**: Aggressive negative letter-spacing (-1.056px at 48px)

### Tailwind + PostCSS

Tailwind config in `frontend/` with custom theme tokens for Linear-inspired colors (e.g., `pos-bg-primary`, `pos-text-secondary`, `pos-accent-primary`). See `tailwind.config.js`.

---

## Important Implementation Details

### Snapshot Pattern

**Always store product name and price at the time of order creation** in `order_items.name_snapshot` and `order_items.price_snapshot`. This ensures historical accuracy when products are edited or deleted later. Reports use these snapshots, not live product data.

### Idempotency

Payment confirmation uses an `idempotency_key` (unique constraint) to safely handle retries. If confirm is called twice, the second call returns the success result without re-processing.

### RBAC

- **CASHIER**: Can create orders, apply discounts (if allowed), confirm payments
- **ADMIN**: Can do everything + manage products, users, settings, view reports, manage shifts, create cash adjustments

Enforcement is at the API layer in route handlers. Frontend checks role for UI visibility.

### QR Configuration

Settings stored in `payment_configs` table:
- `QR_TIMEOUT_SECONDS`: TTL for QR (typically 300s = 5 min)
- `QR_ACCOUNT_NAME`: Display name for QR
- `QR_PROMPTPAY_ID`: Phone or ID number for PromptPay
- Also toggle payment methods via `payment_methods.is_active`

### Reporting

Reports use **aggregation queries** with:
- Filters: date range, payment method, cashier, product/category
- Source of truth: orders (status=COMPLETED), payments (status=SUCCESS), order_items (snapshots)
- Index strategy: `orders(created_at, status)`, `payments(method, status)`, `order_items(product_id)`

---

## Common Workflows

### Add a New Admin Setting

1. Add key-value to `payment_configs` or `settings` table (in `schema.ts`)
2. Expose via `GET/PUT /api/admin/settings/:key` in `routes/admin.ts`
3. Frontend Settings page updates via API
4. Use value from settings context or fetch in component

### Add a New Report Query

1. Write aggregation SQL in `routes/admin.ts` (group by category, cashier, etc.)
2. Add endpoint `GET /api/admin/reports/{report_name}` with filters
3. Frontend Reports page calls endpoint and renders chart/table (Recharts for charts)

### Change Product Price (Without Breaking Old Orders)

1. Update `products.price`
2. Existing orders retain snapshot prices in `order_items` — they are immune to the change
3. New orders will use the new price

### Full Refund

1. Create `refunds` record with order_id, amount, reason, created_by
2. Update `orders.status` to REFUNDED (or COMPLETED + refund record if partial)
3. Log action in `audit_logs`

---

## Code Patterns & Conventions

### TypeScript

- **DB types**: Define in `types/index.ts` (e.g., `User`, `Order`, `Product`)
- **Route responses**: Use consistent shape: `{ success: boolean, data?: T, error?: string }`
- **Error handling**: Custom errors with `statusCode` and `message` fields
- Middleware validates input with **Zod** schemas before reaching handlers

### React Components

- Lazy-load pages in `App.tsx` for code splitting
- Use **ProtectedRoute** wrapper for auth + role checks
- Context API for auth & cart state (no Redux needed at this scale)
- **Framer Motion** for page transitions (see existing fade/slide patterns)
- **Recharts** for dashboard charts (Sales, Payment breakdown, Product performance)
- **Lucide React** for icons throughout

### Styling

- **Tailwind CSS** with custom theme (Linear Design System colors)
- PostCSS plugins: `postcss-nested`, `postcss-import`
- Component-scoped styles via Tailwind classes (no CSS-in-JS)
- Use provided color tokens (e.g., `bg-pos-bg-primary`, `text-pos-text-secondary`)

### API Calls

- Centralized in `frontend/src/lib/api.ts`
- Fetch wrapper with JWT token injection
- All calls under `/api/` prefix

---

## Testing Notes

- **No test suite yet** — unit/integration tests deferred to Phase 2
- **Manual smoke tests** during development:
  1. Login as cashier, create order, add items, checkout
  2. Select QR payment, confirm payment, print receipt
  3. Login as admin, edit product, add user, view reports
  4. Verify audit log captures actions

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/db/schema.ts` | Database schema (SQLite), init function |
| `backend/src/middleware/auth.ts` | JWT verification, role extraction |
| `backend/src/routes/payments.ts` | QR generation & confirmation logic |
| `backend/src/routes/admin.ts` | All admin CRUD + reporting |
| `frontend/src/lib/auth.tsx` | Auth context, ProtectedRoute component |
| `frontend/src/lib/cart.tsx` | Cart state management |
| `frontend/src/pages/POSPage.tsx` | Main cashier interface (order creation + cart) |
| `frontend/src/pages/QRPaymentPage.tsx` | QR display & payment confirm flow |
| `frontend/src/pages/admin/DashboardPage.tsx` | Admin KPI dashboard |
| `tailwind.config.js` | Tailwind theme with Linear colors |

---

## Deployment Notes

- **Environment variables** (backend): `PORT`, `DB_PATH` (defaults: 3001, `./pos.db`)
- **Frontend build**: Static files in `dist/`, serve with nginx or similar
- **JWT secret**: Store in environment, currently hardcoded in `auth.ts` (fix for production!)
- **Database**: SQLite file (`pos.db`) — ensure persistent storage in deployment

---

## Recent Changes

*As of latest commit:* Migrated frontend to Linear Design System (dark mode), fixed PromptPay QR code payload generation to use bank account details from `payment_configs`.

---

## Notes for Future Work

- **Phase 2**: Test suite, payment method auto-verification, shift-based cash control
- **Phase 3**: Refund improvements, better dashboard KPIs, export reports
- **Scaling**: Split to microservices (order-service, payment-service, report-service), add Redis cache layer
- **Auth**: Move JWT secret to environment variable, consider OAuth for admin access
