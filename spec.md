# 📄 spec.md

## POS System Specification

### Project

POS System สำหรับร้าน Sandwich & Coffee แบบหน้าร้าน

### Version

v1.0

### Scope

ระบบนี้ออกแบบสำหรับร้านอาหารขนาดเล็กถึงขนาดกลางที่เน้นการขายหน้าร้าน โดย **ไม่มีระบบ stock/inventory ในเฟสปัจจุบัน** และรองรับการรับชำระเงินแบบ **Cash** และ **Dynamic QR + Manual Confirm**

ระบบต้องรองรับ 2 ฝั่งหลัก:

* **POS / Cashier** สำหรับรับออเดอร์และชำระเงิน
* **Admin / Management** สำหรับจัดการเมนู ตั้งค่าระบบ รายงาน และควบคุมการดำเนินงานของร้าน

---

## 1. Objectives

* รับออเดอร์ได้รวดเร็ว
* คำนวณยอดขายได้ถูกต้อง
* รองรับ QR payment แบบแสดงยอดตามออเดอร์
* ให้พนักงานยืนยันการจ่ายเงินด้วยตนเอง
* ปริ้นใบเสร็จหลังชำระเงินสำเร็จ
* ให้ผู้ดูแลร้านจัดการเมนู ราคา ช่องทางรับเงิน และดูรายงานได้
* รองรับการขยายระบบในอนาคต เช่น multi-branch, loyalty, auto verify payment

---

## 2. Actors

### 2.1 Cashier

สิทธิ์หลัก:

* สร้างออเดอร์
* เพิ่ม/ลบสินค้าในตะกร้า
* ใช้ส่วนลดตามสิทธิ์
* เลือกช่องทางชำระเงิน
* สร้าง QR payment
* ยืนยันการชำระเงิน
* ปริ้นใบเสร็จ
* ดูออเดอร์ของวัน

### 2.2 Admin

สิทธิ์หลัก:

* จัดการสินค้าและราคา
* จัดการผู้ใช้งาน
* ตั้งค่าระบบร้าน
* ตั้งค่าช่องทางรับเงินและ QR
* ปรับเงินสด / ควบคุมกะ
* ดูรายงานและ audit log

---

## 3. Business Scope

### Included in current phase

* Order management
* Product management
* Discount
* Cash / QR payment
* Manual payment confirmation
* Receipt printing
* Admin settings
* Sales reports
* Audit logging

### Excluded from current phase

* Inventory / recipe / stock deduction
* Kitchen Display System (KDS)
* Delivery integration
* Auto payment verification from bank/gateway
* Customer loyalty / member system
* Multi-branch

---

## 4. Functional Requirements

### 4.1 Product Management

Admin ต้องสามารถ:

* เพิ่มสินค้าใหม่
* แก้ไขชื่อสินค้า
* แก้ไขราคา
* จัดหมวดหมู่สินค้า
* เปิด/ปิดการขายสินค้า (`is_active`)
* ซ่อนสินค้าที่เลิกขายโดยไม่กระทบข้อมูลออเดอร์เก่า

#### Product Fields ขั้นต่ำ

* name
* category
* price
* is_active
* sort_order (optional)
* image_url (optional)

#### Rules

* ราคาใหม่ต้องไม่กระทบออเดอร์เก่า
* POS แสดงเฉพาะสินค้าที่ active
* ต้องมี snapshot ชื่อและราคาใน order_items เสมอ

---

### 4.2 Order Management

Cashier ต้องสามารถ:

* สร้างออเดอร์ใหม่
* เพิ่มสินค้าเข้าออเดอร์
* เปลี่ยนจำนวนสินค้า
* ลบสินค้าออกจากออเดอร์
* เห็นยอดรวมแบบ real-time
* ยกเลิกออเดอร์ก่อนชำระเงิน

#### Order Status

* PENDING
* COMPLETED
* CANCELLED
* REFUNDED

#### Rules

* ออเดอร์เริ่มต้นเป็น `PENDING`
* หากจ่ายสำเร็จแล้ว → `COMPLETED`
* หากยกเลิกก่อนจ่าย → `CANCELLED`
* หากคืนเงินทั้งบิล → `REFUNDED`
* ห้ามแก้ไข order items หลัง payment success เว้นแต่มี flow refund/cancel ที่ชัดเจน

#### Snapshot Requirement

ใน `order_items` ต้องเก็บ:

* product_id
* name_snapshot
* price_snapshot
* quantity
* total

เพื่อป้องกันปัญหาราคา/ชื่อสินค้าเปลี่ยนย้อนหลัง

---

### 4.3 Discount

ระบบต้องรองรับส่วนลดแบบ:

* PERCENT
* FIXED

#### Rules

* ใช้ส่วนลดก่อน payment
* discount ต้องไม่ทำให้ net total ติดลบ
* จำกัด role ที่ใช้ discount ได้
* discount ต้องถูกบันทึกไว้ตรวจสอบย้อนหลังได้

#### Suggested Fields

* type
* value
* created_by
* applied_at
* note (optional)

---

### 4.4 Payment

ระบบต้องรองรับ:

* CASH
* QR
* CARD (optional in current DB design, can be disabled)

#### Payment Status

* PENDING
* SUCCESS
* FAILED

#### General Rules

* 1 order ควรมี active payment ได้เพียง 1 รายการในเวลาเดียวกัน
* payment success ต้องอยู่ใน transaction เดียวกับการ update order status
* confirm payment ซ้ำต้องไม่ทำให้ข้อมูลเสียหาย
* payment ทุกครั้งต้องมี audit log

---

### 4.5 Dynamic QR + Manual Confirm

เมื่อเลือกช่องทาง QR:

1. ระบบดึงยอดจากออเดอร์
2. ระบบ generate QR ตามยอดสุทธิของออเดอร์
3. ระบบสร้าง payment record สถานะ `PENDING`
4. POS แสดง QR, amount, reference_code
5. ลูกค้าชำระเงิน
6. Cashier ตรวจสอบสลิป/ยอด/ชื่อบัญชี
7. Cashier กดยืนยัน payment
8. ระบบ update payment = `SUCCESS`
9. ระบบ update order = `COMPLETED`
10. ระบบพร้อมพิมพ์ใบเสร็จ

#### QR Rules

* 1 order = 1 active QR
* QR มี TTL เช่น 5 นาที
* QR ต้องอิงยอดของ order ปัจจุบัน
* ถ้า QR หมดอายุ ต้อง generate ใหม่
* reference_code ควรใช้ order_number หรือ unique ref ที่อ่านง่าย

#### Manual Confirm Rules

* Confirm ได้เฉพาะ payment ที่ยังเป็น `PENDING`
* ถ้า payment success ไปแล้ว ให้ return result เดิม
* ควรเก็บ `confirmed_by` และ `confirmed_at`

---

### 4.6 Receipt

หลัง payment success ระบบต้อง:

* แสดงใบเสร็จบนหน้าจอ
* รองรับการพิมพ์ใบเสร็จ

#### Receipt Content ขั้นต่ำ

* shop name
* receipt no / order number
* date time
* item lines
* subtotal
* discount
* total/net amount
* payment method
* cashier name

#### Optional

* footer text
* tax id
* qr ref
* thank you message

---

### 4.7 Refund

Admin หรือ role ที่ได้รับอนุญาต ต้องสามารถคืนเงินได้

#### Refund Types

* Full refund
* Partial refund

#### Rules

* refund ต้องไม่เกินยอดที่ชำระจริง
* ต้องมี reason
* ต้องมีผู้อนุมัติ/ผู้ทำรายการ
* ควร track refunded amount แยกจาก payment เดิม

#### Order Status Rule

* Full refund → order เป็น `REFUNDED`
* Partial refund → อาจใช้ `COMPLETED` + refund records หรือเพิ่มสถานะใหม่ในอนาคต

---

### 4.8 User & RBAC

ระบบต้องรองรับ role อย่างน้อย:

* ADMIN
* CASHIER

#### Suggested Permission Matrix

* Create order → CASHIER
* Apply discount → CASHIER / ADMIN (ตาม policy)
* Confirm payment → CASHIER
* Refund → ADMIN
* Manage products → ADMIN
* Manage settings → ADMIN
* View reports → ADMIN
* View audit logs → ADMIN

---

## 5. Admin / Management Requirements

### 5.1 Product Administration

* จัดการเมนูทั้งหมด
* จัดลำดับเมนู
* ปิดเมนูชั่วคราว
* แก้ไขราคา

### 5.2 User Management

* สร้าง user
* reset password
* เปิด/ปิดบัญชีผู้ใช้
* กำหนด role

### 5.3 Payment Settings Management

Admin ต้องสามารถ:

* เปิด/ปิด method เช่น CASH / QR / CARD
* เปลี่ยนชื่อบัญชีรับเงิน
* เปลี่ยน promptpay number / account reference
* เปลี่ยน QR image หรือ config ที่ใช้ generate QR
* ตั้งค่าให้ method ใดเป็น default

#### Required Settings Examples

* SHOP_NAME
* RECEIPT_FOOTER
* TAX_PERCENT
* AUTO_PRINT_RECEIPT
* DEFAULT_PAYMENT_METHOD
* QR_ACCOUNT_NAME
* QR_PROMPTPAY_ID
* QR_TIMEOUT_SECONDS

### 5.4 Shift Management

แนะนำให้มีในระบบใช้งานจริง

* เปิดกะ
* ปิดกะ
* บันทึกเงินตั้งต้น
* บันทึกเงินปิดกะ
* เทียบยอด system กับเงินจริง

### 5.5 Cash Adjustment

Admin ต้องสามารถ:

* เพิ่มเงินเข้าลิ้นชัก (เช่น เงินทอน)
* เอาเงินออกจากลิ้นชัก
* ระบุเหตุผลได้
* ตรวจสอบย้อนหลังได้

### 5.6 Audit & Monitoring

ระบบต้องบันทึกเหตุการณ์สำคัญ เช่น:

* login
* create/update product
* change price
* create order
* confirm payment
* refund
* cash adjustment
* setting changes

---

### 5.7 Advanced Reports

Admin ควรมีรายงานที่ครอบคลุมการขาย การชำระเงิน ประสิทธิภาพพนักงาน และคุณภาพการดำเนินงานของร้าน

#### 5.7.1 Sales Summary Reports

รายงานสรุปยอดขายพื้นฐาน

* ยอดขายรายวัน
* ยอดขายรายสัปดาห์
* ยอดขายรายเดือน
* ยอดขายตามช่วงเวลาแบบกำหนดเอง
* จำนวนบิลทั้งหมด
* มูลค่าขายรวมก่อนส่วนลด
* มูลค่าส่วนลดรวม
* ยอดขายสุทธิ
* ค่าเฉลี่ยต่อบิล (Average Order Value)

#### 5.7.2 Payment Breakdown Reports

รายงานแยกตามช่องทางชำระเงิน

* ยอดขายแยกตาม CASH / QR / CARD
* จำนวนรายการชำระเงินต่อ method
* สัดส่วนยอดขายแต่ละ method
* จำนวน payment failed
* จำนวน payment pending ที่ค้างอยู่

#### 5.7.3 Product Performance Reports

รายงานวัดผลการขายสินค้า

* สินค้าขายดีตามจำนวน
* สินค้าขายดีตามมูลค่า
* ยอดขายแยกตาม category
* รายการสินค้าที่ไม่มีการขายในช่วงเวลาที่เลือก
* average quantity ต่อ order ของแต่ละสินค้า

#### 5.7.4 Staff Performance Reports

รายงานตามพนักงาน

* ยอดขายแยกตาม cashier
* จำนวนบิลต่อ cashier
* ค่าเฉลี่ยยอดขายต่อบิลของ cashier
* จำนวน discount ที่แต่ละคนใช้
* จำนวน payment confirm ที่แต่ละคนทำ
* จำนวน refund ที่เกี่ยวข้องกับแต่ละผู้ใช้

#### 5.7.5 Operational Reports

รายงานด้านปฏิบัติการร้าน

* จำนวน order ที่ถูกยกเลิก
* cancellation rate
* refund rate
* average time จาก create order ถึง confirm payment
* average time ต่อการปิดบิล
* จำนวน QR ที่หมดอายุ
* จำนวน duplicate confirm attempts

#### 5.7.6 Shift / Cash Control Reports

รายงานควบคุมเงินสดและกะ

* opening cash / closing cash ต่อ shift
* cash adjustment ทั้งหมดต่อวัน/ต่อกะ
* ยอดเงินสดตามระบบ vs ยอดเงินจริง
* over / short amount

#### 5.7.7 Export & Filter Requirements

รายงานควรสามารถ:

* filter ตามวันที่
* filter ตามช่วงเวลา
* filter ตาม cashier
* filter ตาม payment method
* filter ตาม product/category
* export เป็น CSV/Excel ในอนาคต

#### 5.7.8 Dashboard KPIs

หน้า dashboard ฝั่ง admin ควรมี KPI อย่างน้อย:

* Today sales
* Today orders
* Average order value
* Top 5 products
* Payment breakdown
* Open shift / current cashier summary

#### Acceptance Criteria

* รายงานรายวันต้องโหลดได้ในเวลาที่เหมาะสมบนข้อมูลระดับร้านเดียว
* ผลรวมยอดขายใน report ต้องตรงกับข้อมูล order/payment ที่ success จริง
* รายงานต้องใช้ข้อมูล snapshot จาก order_items และ payment records เพื่อให้ย้อนหลังถูกต้อง

---

## 6. Non-Functional Requirements

### 6.1 Performance

* create order ควรตอบสนองเร็ว
* menu loading ควร cache ได้
* report query ควรมี index รองรับ
* API ทั่วไปควรมี p95 latency ที่เหมาะสมสำหรับร้านขนาดเล็ก

### 6.2 Reliability

* payment confirm ต้องใช้ DB transaction
* ป้องกัน duplicate confirm
* หากระบบล้มหลังจ่ายแต่ก่อน confirm พนักงานต้องกลับมายืนยันต่อได้

### 6.3 Security

* ใช้ JWT auth
* hash password ด้วย bcrypt
* RBAC enforcement ที่ API layer
* validate input ทุก endpoint
* log action สำคัญ

### 6.4 Maintainability

* ออกแบบเป็น modular monolith
* แยก module อย่างน้อย: auth, orders, payments, products, admin, reports
* รองรับการแยก payment service ในอนาคต

### 6.5 Auditability

* การเปลี่ยนแปลงสำคัญต้องย้อนกลับไปดูได้ว่าใครทำ เมื่อไร ทำอะไร

---

## 7. Database Design (Detailed)

### 7.1 users

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

### 7.2 products

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

### 7.3 orders

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

### 7.4 order_items

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

### 7.5 payments

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

### 7.6 discounts

* id (PK)
* order_id
* type
* value
* created_by
* created_at

Indexes:

* order_id

---

### 7.7 refunds

* id (PK)
* order_id
* amount
* reason
* created_by
* created_at

Indexes:

* order_id

---

### 7.8 payment_methods

* id (PK)
* code (QR, CASH, CARD)
* name
* is_active

Indexes:

* code (unique)

---

### 7.9 payment_configs

* id (PK)
* method_id (FK payment_methods)
* key_name
* value
* updated_at

Unique constraint:

* (method_id, key_name)

---

### 7.10 settings

* id (PK)
* key_name (unique)
* value
* updated_at

---

### 7.11 shifts

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

### 7.12 cash_adjustments

* id (PK)
* amount
* type (IN, OUT)
* reason
* created_by
* created_at

Indexes:

* created_at

---

### 7.13 audit_logs

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

## 8. State Machines

### 8.1 Order State

* PENDING → COMPLETED
* PENDING → CANCELLED
* COMPLETED → REFUNDED

### 8.2 Payment State

* PENDING → SUCCESS
* PENDING → FAILED

#### Rules

* ห้าม confirm payment ที่ SUCCESS แล้ว
* ห้าม mark order = COMPLETED ถ้า payment ไม่ SUCCESS
* CANCELLED ต้องเกิดก่อน payment success

---

## 9. Sequence Diagram (Detailed)

### 9.1 Create Order + QR Payment + Confirm

```text
Cashier → POS UI: เลือกสินค้า
POS UI → API: POST /orders
API → DB: create orders
API → DB: create order_items
API → POS UI: orderId, orderNumber, totals

Cashier → POS UI: เลือก QR payment
POS UI → API: GET /payments/:orderId/qr
API → DB: check active payment
API → DB: create payment (PENDING)
API → QR Generator: generate payload/image
API → POS UI: qr, amount, ref

Customer → Mobile Banking: scan and pay
Cashier → POS UI: กด Confirm Payment
POS UI → API: POST /payments/:id/confirm
API → DB (transaction): update payments = SUCCESS
API → DB (transaction): update orders = COMPLETED
API → DB: insert audit_logs
API → POS UI: success
POS UI → Printer: print receipt
```

### 9.2 Duplicate Confirm

```text
Cashier → API: POST /payments/:id/confirm
API → DB: payment.status = SUCCESS
API → Cashier: return existing success result
```

### 9.3 QR Expired

```text
POS UI → API: GET /payments/:orderId/qr
API → DB: found expired pending payment
API → DB: mark old payment failed/expired or create new payment
API → QR Generator: generate new QR
API → POS UI: new QR
```

---

## 10. API Scope (High Level)

### Auth

* POST /auth/login
* POST /auth/logout
* POST /auth/refresh

### POS

* GET /products
* POST /orders
* GET /orders/:id
* POST /orders/:id/cancel
* GET /payments/:orderId/qr
* POST /payments/:id/confirm
* GET /payments/:id
* GET /orders/:id/receipt

### Admin

* CRUD /admin/products
* CRUD /admin/users
* GET/PUT /admin/settings
* GET/PUT /admin/payment-methods
* POST /admin/cash-adjustments
* POST /admin/shifts/open
* POST /admin/shifts/:id/close
* GET /admin/reports/*
* GET /admin/audit-logs

---

## 11. Error Handling

* 400 validation error
* 401 unauthorized
* 403 forbidden
* 404 not found
* 409 conflict
* 422 business rule violation
* 500 internal server error

#### Example Business Errors

* order already completed
* payment already confirmed
* qr expired
* invalid discount
* refund amount exceeds paid amount

---

## 12. Edge Cases

* ลูกค้าจ่ายแล้วแต่พนักงานยังไม่กดยืนยัน
* กด confirm ซ้ำ
* QR หมดอายุระหว่างรอ
* เปลี่ยนราคาเมนูหลังจากมี order แล้ว
* เครื่องปริ้นหลุด / พิมพ์ไม่ออก
* เน็ตช้าระหว่างสร้าง QR
* cashier ปิดหน้าจอแล้วกลับมาเปิดใหม่

---

## 13. Suggested Milestones

### Phase 1

* products
* orders
* cash payment
* QR payment
* manual confirm
* receipt

### Phase 2

* admin settings
* reports
* user management
* shift and cash adjustment

### Phase 3

* refund improvements
* better dashboards
* export reports
* multi-branch prep

---

## 14. Definition of Done

ระบบถือว่าพร้อมใช้งานเมื่อ:

* cashier สร้าง order และรับเงินได้ครบ flow
* QR แสดงยอดถูกต้องตาม order
* confirm payment แล้ว order ปิดได้ถูกต้อง
* พิมพ์ใบเสร็จได้
* admin เพิ่ม/แก้ไขเมนูได้
* admin เปลี่ยน QR account ได้
* admin ดูรายงานหลักได้
* audit log ตรวจสอบเหตุการณ์สำคัญได้

---
