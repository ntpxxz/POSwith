# 📄 arc.md

## System Design (Aligned with Spec v1.0)

---

## 1. Architecture

### Style

* Modular Monolith (ready to split to services)

### Layers

Client (POS / Admin)
→ API Layer (Express)
→ Service Layer (Order / Payment / Product / Admin / Report)
→ Data Layer (MySQL)

### Optional

* Redis (cache menu / settings)
* Background jobs (report aggregation, cleanup expired QR)

---

## 2. Module Breakdown

### 2.1 Order Module

Responsibility:

* create order
* manage order items
* calculate totals
* enforce order state

### 2.2 Payment Module

Responsibility:

* generate dynamic QR
* create payment record
* confirm payment
* enforce idempotency

### 2.3 Product Module

* manage menu
* pricing
* category

### 2.4 Admin Module

* users
* settings
* payment configs
* shift / cash
* audit logs

### 2.5 Report Module

* aggregation queries
* KPI computation
* filters and exports

---

## 3. Database Design (Detailed)

### 3.1 users

* id (PK)
* name
* email (unique)
* password_hash
* role (ADMIN, CASHIER)
* is_active
* created_at

Indexes:

* email

---

### 3.2 products

* id (PK)
* name
* category
* price
* is_active
* sort_order
* image_url
* created_at
* updated_at

Indexes:

* is_active
* category

---

### 3.3 orders

* id (PK)
* order_number (unique)
* status (PENDING, COMPLETED, CANCELLED, REFUNDED)
* total_amount
* discount_amount
* net_amount
* created_by (FK users)
* created_at
* updated_at

Indexes:

* order_number (unique)
* status
* created_at

---

### 3.4 order_items

* id (PK)
* order_id (FK orders)
* product_id (FK products)
* name_snapshot
* price_snapshot
* quantity
* total

Indexes:

* order_id
* product_id

---

### 3.5 payments

* id (PK)
* order_id (FK orders)
* status (PENDING, SUCCESS, FAILED)
* amount
* method (CASH, QR, CARD)
* idempotency_key (unique)
* reference_code
* confirmed_by (FK users)
* confirmed_at
* created_at

Indexes:

* order_id
* status
* idempotency_key (unique)

Constraint (logical):

* 1 active (PENDING) payment per order

---

### 3.6 discounts

* id (PK)
* order_id
* type
* value
* created_by
* created_at

Indexes:

* order_id

---

### 3.7 refunds

* id (PK)
* order_id
* amount
* reason
* created_by
* created_at

Indexes:

* order_id

---

### 3.8 payment_methods

* id (PK)
* code (QR, CASH, CARD)
* name
* is_active

Indexes:

* code (unique)

---

### 3.9 payment_configs

* id (PK)
* method_id (FK payment_methods)
* key_name
* value
* updated_at

Unique constraint:

* (method_id, key_name)

---

### 3.10 settings

* id (PK)
* key_name (unique)
* value
* updated_at

---

### 3.11 shifts

* id (PK)
* opened_by
* closed_by
* opening_cash
* closing_cash
* status (OPEN, CLOSED)
* opened_at
* closed_at

Indexes:

* status
* opened_at

---

### 3.12 cash_adjustments

* id (PK)
* amount
* type (IN, OUT)
* reason
* created_by
* created_at

Indexes:

* created_at

---

### 3.13 audit_logs

* id (PK)
* action
* user_id
* entity
* entity_id
* payload (JSON)
* created_at

Indexes:

* user_id
* entity
* created_at

---

## 4. Key Design Decisions

### 4.1 No Inventory

* ลด complexity
* เน้นขายหน้าร้าน

### 4.2 Snapshot Strategy

* เก็บ name_snapshot และ price_snapshot
* ทำให้ report ย้อนหลังถูกต้อง

### 4.3 Dynamic QR per Order

* generate ทุกครั้ง
* bind กับ order_number

### 4.4 Manual Confirm

* ลด dependency ภายนอก
* รองรับร้านทั่วไป

### 4.5 Idempotency

* ใช้ idempotency_key ใน payments
* confirm ซ้ำไม่กระทบข้อมูล

---

## 5. Transaction Strategy

Critical operations:

* confirm payment
* refund

Example:
BEGIN
→ update payment SUCCESS
→ update order COMPLETED
COMMIT

Rollback หากมี error

---

## 6. Report Design

### 6.1 Source of Truth

* orders (status = COMPLETED)
* payments (status = SUCCESS)
* order_items (snapshot)

### 6.2 Query Strategy

* ใช้ aggregation SQL (GROUP BY)
* index ที่ created_at, status, method

### 6.3 Example Indexes เพิ่ม

* orders(created_at, status)
* payments(method, status)
* order_items(product_id)

### 6.4 Future Optimization

* materialized tables (daily_summary)
* caching (Redis)

---

## 7. Payment Service Design

### Responsibilities

* QR generation
* payment lifecycle
* validation

### Internal Steps

1. validate order
2. check existing payment
3. create new payment
4. generate QR

### Confirm Flow

1. validate payment
2. check status
3. update payment
4. update order

---

## 8. Security Design

* JWT auth
* password hash (bcrypt)
* RBAC middleware
* validate input

---

## 9. Scaling Plan

### Phase 1

* single instance

### Phase 2

* add Redis

### Phase 3

* split services:

  * order-service
  * payment-service
  * report-service

---

## 10. Observability

Logs:

* payment confirm
* order create
* admin actions

Metrics:

* total orders
* revenue
* payment success rate

---

## 11. Cleanup Jobs (Recommended)

* expire QR (mark old PENDING → FAILED)
* archive old audit logs

---

## 12. Deployment Notes

* environment variables (DB, JWT secret)
* use Docker
* reverse proxy (nginx)

---