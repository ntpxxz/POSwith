# POSwith — ระบบ POS สำหรับร้านแซนด์วิชและกาแฟ

ระบบ Point of Sale (POS) สำหรับร้านขนาดเล็กถึงกลาง รองรับการรับออเดอร์หน้าเคาน์เตอร์ ชำระเงินสด/QR PromptPay พิมพ์ใบเสร็จ และจัดการร้านผ่านหน้า Admin ครบวงจร

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้งและใช้งาน](#การติดตั้งและใช้งาน)
- [ฟีเจอร์ที่พัฒนาแล้ว](#ฟีเจอร์ที่พัฒนาแล้ว)
- [สิ่งที่ต้องพัฒนาต่อ](#สิ่งที่ต้องพัฒนาต่อ)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [บัญชีเริ่มต้น](#บัญชีเริ่มต้น)

---

## ภาพรวมระบบ

```
                    ┌─────────────────────────────────┐
                    │         React Frontend           │
                    │  (Vite + Tailwind + TypeScript)  │
                    │                                  │
                    │  /login        → หน้าเข้าสู่ระบบ  │
                    │  /pos          → หน้า POS แคชเชียร์│
                    │  /checkout     → ชำระเงิน         │
                    │  /payment/qr   → QR PromptPay    │
                    │  /admin/*      → จัดการร้าน       │
                    └────────────┬────────────────────┘
                                 │ HTTP /api
                    ┌────────────▼────────────────────┐
                    │         Express.js Backend       │
                    │         (Node 20 + Prisma)       │
                    │                                  │
                    │  /auth   /products   /orders     │
                    │  /payments  /admin  /print       │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │       PostgreSQL 16              │
                    │  (13 tables, Docker volume)      │
                    └─────────────────────────────────┘
```

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS |
| Backend | Node.js 20, Express.js, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Authentication | JWT + bcrypt |
| Payment QR | promptpay-qr, qrcode |
| Charts | Recharts |
| Animations | Framer Motion |
| Container | Docker + Docker Compose |

---

## โครงสร้างโปรเจกต์

```
POSwith/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Entry point
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT + RBAC middleware
│   │   └── routes/
│   │       ├── auth.ts            # Login/Logout
│   │       ├── products.ts        # เมนูสินค้า
│   │       ├── orders.ts          # ออเดอร์
│   │       ├── payments.ts        # ชำระเงิน / QR
│   │       ├── admin.ts           # จัดการร้าน
│   │       └── print.ts           # พิมพ์ใบเสร็จ
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── migrations/            # Migration files
│   │   └── seed.ts                # ข้อมูลเริ่มต้น
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Router configuration
│   │   ├── lib/
│   │   │   ├── api.ts             # HTTP client (JWT auto-attach)
│   │   │   ├── auth.tsx           # AuthContext + ProtectedRoute
│   │   │   └── cart.tsx           # CartContext
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── POSPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── QRPaymentPage.tsx
│   │   │   └── admin/
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── ProductManagement.tsx
│   │   │       ├── UserManagement.tsx
│   │   │       ├── SettingsPage.tsx
│   │   │       ├── ReportsPage.tsx
│   │   │       ├── ShiftPage.tsx
│   │   │       ├── AuditLogPage.tsx
│   │   │       └── RefundPage.tsx
│   │   └── types/index.ts         # TypeScript interfaces
│   ├── vite.config.ts             # Proxy /api → localhost:3000
│   └── tailwind.config.js
├── docker-compose.yml
├── spec.md                        # Functional specification
├── arc.md                         # Architecture documentation
└── DESIGN.md                      # Design system
```

---

## การติดตั้งและใช้งาน

### ความต้องการเบื้องต้น

- Docker และ Docker Compose
- Node.js 20+ (สำหรับ local development)

### วิธีรันด้วย Docker (แนะนำ)

```bash
# Clone โปรเจกต์
git clone <repo-url>
cd POSwith

# รันระบบทั้งหมด (PostgreSQL + Backend)
docker compose up -d

# Backend พร้อมใช้งานที่ http://localhost:3000
```

> Docker จะ migrate database และ seed ข้อมูลเริ่มต้นโดยอัตโนมัติ

### วิธีรัน Frontend (Development)

```bash
cd frontend
npm install
npm run dev
# Frontend พร้อมที่ http://localhost:5173
```

### วิธีรัน Backend แบบ Local (ไม่ใช้ Docker)

```bash
# สร้างไฟล์ .env ใน backend/
cat > backend/.env << EOF
DATABASE_URL="postgresql://pos_user:pos_password@localhost:5432/pos_db"
JWT_SECRET="your-secret-key-here"
PORT=3000
NODE_ENV=development
EOF

cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Environment Variables

| Variable | ค่าเริ่มต้น | คำอธิบาย |
|----------|------------|---------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | `change_me_in_production` | Secret สำหรับ JWT token |
| `PORT` | `3000` | Port ของ backend |
| `NODE_ENV` | `development` | Environment mode |

> **สำคัญ:** เปลี่ยน `JWT_SECRET` ก่อน deploy production

---

## ฟีเจอร์ที่พัฒนาแล้ว

### แคชเชียร์ (Role: CASHIER)

- [x] เรียกดูเมนูสินค้า แยกตามหมวดหมู่ + ค้นหา
- [x] เพิ่ม/ลบ/แก้จำนวนสินค้าในตะกร้า
- [x] สร้างออเดอร์พร้อม order number รูปแบบ `ORD-YYYYMMDD-###`
- [x] ส่วนลด (เปอร์เซ็นต์ / จำนวนเงินคงที่)
- [x] ชำระเงินสด — คำนวณเงินทอนอัตโนมัติ
- [x] ชำระเงิน QR PromptPay — generate QR แบบ dynamic ต่อออเดอร์
- [x] ยืนยันการรับเงิน QR แบบ manual
- [x] แสดงใบเสร็จ + พิมพ์
- [x] Logout พร้อม audit log

### แอดมิน (Role: ADMIN)

- [x] **Dashboard** — ยอดขายวันนี้, จำนวนออเดอร์, ค่าเฉลี่ย, Top 5 สินค้า, แผนภูมิยอดขาย
- [x] **จัดการสินค้า** — เพิ่ม/แก้ไข/ลบ, หมวดหมู่, ลำดับ, รูปภาพ, เปิด/ปิดขาย
- [x] **จัดการผู้ใช้** — สร้าง/แก้ไข/ระงับบัญชี, กำหนด Role (ADMIN/CASHIER)
- [x] **ตั้งค่าร้าน** — ชื่อร้าน, footer ใบเสร็จ, VAT, QR PromptPay ID, timeout
- [x] **การเปิด-ปิดกะ** — บันทึกยอดเงินต้นกะ/ปลายกะ
- [x] **ปรับยอดเงินสด** — บันทึก IN/OUT พร้อมเหตุผล
- [x] **รายงาน** — ยอดขาย, ประสิทธิภาพสินค้า, วิธีชำระเงิน, กรองตามวันที่
- [x] **Audit Log** — ติดตามทุกการกระทำสำคัญในระบบ
- [x] **ระบบคืนเงิน (Refund)** — ค้นหาออเดอร์ด้วยเลขออเดอร์, คืนเงินบางส่วนหรือเต็มจำนวน, อัปเดต order status → `REFUNDED` อัตโนมัติเมื่อคืนครบ, audit log ทุกรายการ

### แคชเชียร์ — Auto-print

- [x] **Auto-print ใบเสร็จ** — อ่าน setting `AUTO_PRINT_RECEIPT` จาก DB ก่อนพิมพ์ทุกครั้ง; ถ้า `true` ส่งคำสั่งไปยัง ESC/POS endpoint แล้ว fallback `window.print()` ถ้า hardware ไม่พร้อม; ถ้า `false` ไม่พิมพ์อัตโนมัติ (กดปุ่ม Print ได้ตลอด)

---

## สิ่งที่ต้องพัฒนาต่อ

### Phase 2 — ฟีเจอร์หลักที่ยังขาด

| ฟีเจอร์ | รายละเอียด | ความสำคัญ |
|---------|-----------|----------|
| ~~**ESC/POS Printer จริง**~~ | ✅ เสร็จแล้ว — `print.ts` ใช้ `node-thermal-printer` จริง รองรับ EPSON/STAR ผ่าน TCP; ตั้งค่า IP/port ใน Settings (`PRINTER_INTERFACE`, `PRINTER_TYPE`, `PRINTER_CHAR_SET`, `PRINTER_ENABLED`) | กลาง |
| **รายงานพนักงาน** | วิเคราะห์ยอดขายแยกตามแคชเชียร์แต่ละคน | กลาง |
| **รายงานการยกเลิก** | Cancellation rate, เหตุผลการยกเลิก | กลาง |
| **รายงานกะ/Cash Control** | สรุปยอดเงินสดต่อกะ, เปรียบเทียบยอดจริงกับระบบ | สูง |

### Phase 2 — คุณภาพและ UX

| งาน | รายละเอียด |
|-----|-----------|
| ~~**Image Upload จริง**~~ | ✅ เสร็จแล้ว — Multer บันทึกไฟล์ใน `uploads/products/` (local storage), ฟอร์ม CRUD เปลี่ยนเป็น drag-and-drop upload พร้อม preview |
| ~~**QR Timeout UI**~~ | ✅ เสร็จแล้ว — `TimerBar` component แสดง countdown + expired overlay พร้อมปุ่ม Refresh Code ใน QRPaymentPage |
| ~~**Error Boundary**~~ | ✅ เสร็จแล้ว — `ErrorBoundary.tsx` wrap app ใน `main.tsx` จัดการ uncaught errors แล้ว |
| ~~**Loading States**~~ | ✅ เสร็จแล้ว — ทุกหน้าใช้ skeleton screens แทน spinner; QRPaymentPage และ ReportsPage ได้รับ skeleton ที่ match layout จริง |
| **Mobile Responsive** | ปรับ layout หน้า POS สำหรับ tablet |
| **Offline Mode** | ทำงานได้เมื่อ network ขาด (Service Worker / local queue) |

### Phase 3 — Production Readiness

| งาน | รายละเอียด |
|-----|-----------|
| ~~**HTTPS / Reverse Proxy**~~ | ✅ เสร็จแล้ว — `nginx/nginx.conf` + nginx service ใน `docker-compose.yml`; route `/api` และ `/uploads` → backend:3000, `/` → frontend static build; backend ไม่ expose port ออกนอกแล้ว |
| **Rate Limiting** | ป้องกัน brute force บน `/auth/login` |
| **Health Check Endpoint** | `/health` สำหรับ monitoring |
| **Log Aggregation** | ส่ง logs ออกไปยัง external system (Loki/Datadog) |
| **Backup Strategy** | Automated PostgreSQL backup |
| **CI/CD Pipeline** | GitHub Actions สำหรับ test + build + deploy |
| **Auto Payment Verification** | Integration กับ banking API หรือ payment gateway จริง |

### Phase 4 — ฟีเจอร์ขยาย (Optional)

| ฟีเจอร์ | หมายเหตุ |
|---------|---------|
| **Kitchen Display System (KDS)** | แสดงออเดอร์ในครัวแบบ real-time (WebSocket) |
| **Customer Loyalty** | สะสมแต้ม / ระบบสมาชิก |
| **Inventory Management** | ติดตาม stock วัตถุดิบ |
| **Multi-branch** | รองรับหลายสาขาในระบบเดียว |
| **Line Notification** | แจ้งเตือนผู้ดูแลผ่าน Line เมื่อยอดขายถึงเป้า |

---

## Database Schema

ตารางหลัก 13 ตาราง:

```
users              — ผู้ใช้งาน (ADMIN / CASHIER)
products           — สินค้าในเมนู
orders             — ออเดอร์ทั้งหมด
order_items        — รายการสินค้าต่อออเดอร์ (snapshot ราคา ณ เวลาขาย)
payments           — การชำระเงิน (idempotency key)
discounts          — ส่วนลดที่ใช้
refunds            — การคืนเงิน
payment_methods    — วิธีชำระเงินที่รองรับ
payment_configs    — ค่าตั้งค่าต่อวิธีชำระเงิน (PromptPay ID, timeout ฯลฯ)
settings           — ค่าตั้งค่าร้าน (key-value)
shifts             — กะการทำงาน
cash_adjustments   — การปรับยอดเงินสด
audit_logs         — บันทึกการกระทำสำคัญ
```

**Order Status Flow:**
```
PENDING → COMPLETED
        → CANCELLED
COMPLETED → REFUNDED
```

**Payment Status Flow:**
```
PENDING → SUCCESS
        → FAILED
```

---

## API Endpoints

| Module | Method | Path | คำอธิบาย |
|--------|--------|------|---------|
| Auth | POST | `/api/auth/login` | เข้าสู่ระบบ |
| Auth | POST | `/api/auth/logout` | ออกจากระบบ |
| Products | GET | `/api/products` | ดูรายการสินค้า |
| Orders | POST | `/api/orders` | สร้างออเดอร์ |
| Orders | GET | `/api/orders/:id` | ดูรายละเอียดออเดอร์ |
| Payments | POST | `/api/payments/qr` | สร้าง QR Payment |
| Payments | POST | `/api/payments/cash` | ชำระเงินสด |
| Payments | POST | `/api/payments/:id/confirm` | ยืนยันการรับเงิน |
| Admin | GET | `/api/admin/dashboard` | ข้อมูล KPI |
| Admin | CRUD | `/api/admin/products` | จัดการสินค้า |
| Admin | CRUD | `/api/admin/users` | จัดการผู้ใช้ |
| Admin | GET/PUT | `/api/admin/settings` | ตั้งค่าร้าน |
| Admin | GET | `/api/admin/reports` | รายงาน |
| Admin | CRUD | `/api/admin/shifts` | กะการทำงาน |
| Admin | POST | `/api/admin/cash-adjustments` | ปรับยอดเงินสด |
| Admin | GET | `/api/admin/audit-logs` | Audit log |
| Admin | GET | `/api/admin/orders` | ค้นหาออเดอร์ (refund search) |
| Admin | POST | `/api/admin/refunds` | สร้างรายการคืนเงิน |
| Print | POST | `/api/print/receipt/:orderId` | สั่งพิมพ์ใบเสร็จ (ตรวจ AUTO_PRINT_RECEIPT) |

> ทุก endpoint ยกเว้น `/api/auth/login` ต้องส่ง `Authorization: Bearer <token>`

---

## บัญชีเริ่มต้น

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@pos.com` | `admin123` |
| Cashier | `cashier@pos.com` | `cashier123` |

> **เปลี่ยนรหัสผ่านก่อนใช้งานจริงทันที**

---

## ข้อมูลตัวอย่างใน Seed

- สินค้า 17 รายการ (กาแฟ 8, แซนด์วิช 5, เบเกอรี่ 4)
- วิธีชำระเงิน: เงินสด (default), QR PromptPay (active), บัตรเครดิต (disabled)
- PromptPay ID ตัวอย่าง: `0812345678`
- QR timeout: 300 วินาที (5 นาที)

---

## เอกสารอ้างอิง

- [spec.md](spec.md) — Functional Specification ฉบับเต็ม
- [arc.md](arc.md) — Architecture และ Design Decisions
- [DESIGN.md](DESIGN.md) — Design System (สี, Typography, Components)
