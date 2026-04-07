# DESIGN.md — POS System (Sandwich & Coffee)

> UI/UX Design Guide สำหรับระบบ POS หน้าร้าน  
> วิเคราะห์และดัดแปลงจาก Jasper.ai Design Language เพื่อให้เหมาะกับ context POS ร้านอาหาร

---

## 1. Design Inspiration: Jasper.ai Analysis

### 1.1 สิ่งที่เรียนรู้จาก Jasper.ai

Jasper.ai ใช้ design language ที่มีลักษณะเด่นดังนี้:

**Visual Language**
- พื้นหลังเข้ม (dark navy / charcoal) สลับกับ section สีขาว สร้าง contrast ชัดเจน
- Typography หนา bold มาก สำหรับ hero text — ทำให้อ่านง่ายในทุก viewport
- CTA buttons โดดเด่นด้วย fill solid สีสว่าง (orange/coral accent) บนพื้นเข้ม
- Layout แบบ card-based grid ที่เป็นระเบียบ แต่มี visual hierarchy ชัดเจน
- Whitespace ใจกว้าง — ไม่ยัดข้อมูล ให้แต่ละ element หายใจได้

**Interaction Patterns**
- Navigation แบบ mega-menu พร้อม icon + description — ผู้ใช้เข้าใจ context ทันที
- Tab/toggle เพื่อ switch content group (เช่น Solutions by role) โดยไม่ reload page
- Social proof (logos, numbers) วางเป็น ticker strip — สร้าง trust โดยไม่กินพื้นที่
- Progressive disclosure: แสดงสิ่งสำคัญก่อน ซ่อน detail ไว้ใต้ expand/modal

**Color & Mood**
- Primary dark: `#4D77FF` (near-black navy)
- Accent warm: `#FF6B35` (coral-orange)
- Text on dark: `#F5F5F0` (warm white)
- Secondary accent: `#4FD1C5` (teal/cyan highlight)

---

## 2. Design Adaptation สำหรับ POS System

### 2.1 Context Difference

| ลักษณะ | Jasper.ai (Marketing SaaS) | POS System ร้านอาหาร |
|--------|---------------------------|----------------------|
| ผู้ใช้ | นักการตลาด, office | Cashier ยืนหน้าเคาน์เตอร์ |
| Device | Desktop / Laptop | Tablet / Touchscreen |
| Session | ทำงานต่อเนื่อง | Transaction สั้น ๆ ซ้ำ ๆ |
| Priority | Feature discovery | Speed + Accuracy |
| Lighting | Office controlled | ร้านสว่าง, มีแสงแดด |
| Error cost | ต่ำ | สูง (เงิน, ลูกค้ารอ) |

### 2.2 Core Design Principles สำหรับ POS นี้

1. **Speed First** — การ tap ควรเกิด action ทันที feedback ภายใน 150ms
2. **Big Tap Targets** — ปุ่มทุกอันขนาดขั้นต่ำ 56px × 56px สำหรับ touch
3. **High Contrast** — ตัวเลขราคา ยอดรวม ต้องอ่านได้จากระยะ arm's length
4. **Minimal Cognitive Load** — แต่ละหน้าทำงานเดียว ไม่มี decision fatigue
5. **Error Recovery** — Toast / Banner แจ้งเตือน พร้อม action ทำ undo หรือ retry ชัดเจน

---

## 3. Design System

### 3.1 Color Palette

```css
/* ได้รับแรงบันดาลใจจาก Jasper.ai dark + warm accent แต่ปรับให้เหมาะ POS */

--color-bg-primary:      #0F0F1A;   /* Dark navy — ลด eye strain กะกลางคืน */
--color-bg-surface:      #1A1A2E;   /* Card / Panel background */
--color-bg-elevated:     #252540;   /* Modal, Dropdown, Active state */

--color-accent-primary:  #FF6B35;   /* Coral-Orange — Primary CTA, ยืนยัน */
--color-accent-success:  #10D98A;   /* Emerald Green — Payment success, confirm */
--color-accent-warning:  #F5A623;   /* Amber — QR timer, expiry warning */
--color-accent-danger:   #FF4757;   /* Red — Cancel, Error, Refund */
--color-accent-info:     #4FC3F7;   /* Light Blue — QR display, reference code */

--color-text-primary:    #F5F5F0;   /* Warm white — main content */
--color-text-secondary:  #A0A0B8;   /* Muted — labels, helper text */
--color-text-disabled:   #4A4A6A;   /* Disabled state */
--color-text-on-accent:  #FFFFFF;   /* Text บน accent buttons */

--color-border-default:  #2E2E4A;   /* Divider, card border */
--color-border-focus:    #FF6B35;   /* Focus ring */

/* Semantic aliases */
--color-price:           #F5F5F0;   /* ราคา — ต้องชัด */
--color-total:           #FF6B35;   /* ยอดรวม — เน้นพิเศษ */
--color-qr-bg:           #FFFFFF;   /* QR code background ต้องขาว */
```

**Light Mode (Admin Dashboard — optional)**

```css
--color-bg-primary:      #F8F8FC;
--color-bg-surface:      #FFFFFF;
--color-bg-elevated:     #EEF0FF;
--color-text-primary:    #0F0F1A;
--color-text-secondary:  #5A5A7A;
--color-accent-primary:  #E05A28;   /* Orange เข้มขึ้นบนพื้นขาว */
```

### 3.2 Typography

```css
/* Display font: หนา อ่านง่าย จากระยะไกล */
--font-display: 'Sora', sans-serif;       /* สำหรับราคา, ยอดรวม, header */

/* Body font: ชัดเจน อ่านเร็ว */
--font-body:    'IBM Plex Sans Thai', sans-serif;  /* รองรับภาษาไทย */

/* Mono: code, reference number, order number */
--font-mono:    'JetBrains Mono', monospace;

/* Scale */
--text-xs:   11px;   /* Badge, timestamp */
--text-sm:   13px;   /* Label, caption */
--text-base: 15px;   /* Body, list item */
--text-md:   17px;   /* Card title, nav item */
--text-lg:   20px;   /* Section header */
--text-xl:   24px;   /* Page title, order total */
--text-2xl:  32px;   /* Big price display */
--text-3xl:  48px;   /* Payment amount on QR screen */
--text-hero: 64px;   /* Fullscreen confirmation number */
```

### 3.3 Spacing System

```css
/* 4px base grid */
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
```

### 3.4 Border Radius

```css
--radius-sm:   6px;    /* Badge, tag */
--radius-md:   10px;   /* Input, small card */
--radius-lg:   16px;   /* Product card */
--radius-xl:   24px;   /* Modal, bottom sheet */
--radius-full: 9999px; /* Pill button, avatar */
```

### 3.5 Shadows & Elevation

```css
--shadow-card:   0 2px 8px rgba(0,0,0,0.4);
--shadow-modal:  0 16px 48px rgba(0,0,0,0.6);
--shadow-float:  0 4px 16px rgba(255,107,53,0.3);  /* Accent glow effect */
```

---

## 4. Layout Architecture

### 4.1 POS / Cashier View (Tablet 1024px landscape)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Shop Name | Shift Status | Cashier Name | Time   [≡]   │
├──────────────────────────┬──────────────────────────────────────┤
│                          │                                        │
│   PRODUCT GRID           │   ORDER CART                          │
│   (LEFT PANEL — 60%)     │   (RIGHT PANEL — 40%)                 │
│                          │                                        │
│  [Category Tab Bar]      │  Order #2025-001                      │
│                          │  ─────────────────────                │
│  ┌──────┐  ┌──────┐     │  ☕ Americano  x2    ฿120             │
│  │ IMG  │  │ IMG  │     │  🥪 BLT Sand  x1    ฿90              │
│  │      │  │      │     │  ─────────────────────                │
│  │ Name │  │ Name │     │  Subtotal           ฿210             │
│  │ ฿XXX │  │ ฿XXX │     │  Discount           -฿0              │
│  └──────┘  └──────┘     │  ─────────────────────                │
│                          │  NET TOTAL          ฿210             │
│  ┌──────┐  ┌──────┐     │                                        │
│  │ IMG  │  │ IMG  │     │  [% Discount]  [Cancel Order]         │
│  └──────┘  └──────┘     │                                        │
│                          │  ┌─────────────┐  ┌───────────────┐  │
│                          │  │   CASH      │  │   QR Pay      │  │
│                          │  └─────────────┘  └───────────────┘  │
│                          │                                        │
└──────────────────────────┴──────────────────────────────────────┘
```

### 4.2 QR Payment Screen (Full-screen overlay)

```
┌─────────────────────────────────────────────────────────────────┐
│                    <- กลับ                    [X ยกเลิก]        │
│                                                                   │
│              ┌────────────────────────────┐                      │
│              │                            │                      │
│              │     ████ QR CODE ████      │                      │
│              │     ████         ████      │                      │
│              │     ████         ████      │                      │
│              │                            │                      │
│              └────────────────────────────┘                      │
│                                                                   │
│                    ยอดชำระ: ฿210.00                              │
│               Ref: ORD-20250407-001                              │
│                                                                   │
│              QR หมดอายุใน  04:32                                 │
│                                                                   │
│         ┌──────────────────────────────────────────┐            │
│         │         ✅ ยืนยันการชำระเงินแล้ว          │            │
│         └──────────────────────────────────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Admin Dashboard Layout (Desktop 1280px+)

```
┌───────┬───────────────────────────────────────────────────────┐
│       │  TOP BAR: breadcrumb | user menu                       │
│  NAV  ├───────────────────────────────────────────────────────┤
│       │                                                         │
│  Home │  KPI CARDS ROW                                         │
│  Orders│  [Today Sales] [Orders] [Avg Value] [Top Product]     │
│  Prod ├───────────────────────────────────────────────────────┤
│  Pay  │                                                         │
│  Users│  CHARTS SECTION                                        │
│  Setup│  [Sales Chart — Line/Bar]  [Payment Breakdown — Pie]   │
│  Rpts │                                                         │
│  Audit├───────────────────────────────────────────────────────┤
│       │  RECENT ORDERS TABLE                                    │
│       │  # | Time | Items | Total | Method | Status | Action   │
└───────┴───────────────────────────────────────────────────────┘
```

---

## 5. Components Design

### 5.1 Product Card

```
┌──────────────────┐
│   ┌──────────┐   │
│   │  IMAGE   │   │  <- 1:1 aspect ratio, object-fit: cover
│   │  (120px) │   │     มี overlay badge "SOLD OUT" เมื่อ inactive
│   └──────────┘   │
│  Americano       │  <- font-body, text-md, semi-bold
│  ฿ 65            │  <- font-display, text-xl, accent-primary color
└──────────────────┘
```

- **Hover / Active state**: background เปลี่ยนเป็น `--color-bg-elevated`, border `--color-border-focus`
- **Pressed state**: scale(0.96) transition 100ms
- **Inactive (hidden from POS)**: ไม่แสดง

### 5.2 Cart Item Row

```
[X]  Americano     x  [-] 2 [+]    ฿130
     (name_snapshot)              (price x qty)
```

- tap [-] / [+] มี haptic-like visual feedback (scale pulse)
- ราคารวมอัพเดท real-time ไม่ต้องกดอะไร

### 5.3 Order Total Bar (Fixed Bottom ของ Cart Panel)

```
┌─────────────────────────────────────────┐
│  Subtotal    ฿210                       │
│  Discount    -฿10   [แก้ไข]            │
│  ═══════════════════════════            │
│  NET TOTAL   ฿200   <- text-3xl, orange │
└─────────────────────────────────────────┘
```

### 5.4 Payment Method Buttons

ใช้ style แบบ Jasper.ai CTA — solid fill + icon + label ใหญ่:

```css
/* Cash Button */
background: #10D98A;     /* Success green */
color: #0F0F1A;
height: 64px;
border-radius: var(--radius-lg);
font-size: var(--text-lg);
font-weight: 700;

/* QR Button */
background: var(--color-accent-info);
color: #0F0F1A;
```

### 5.5 QR Timer

```jsx
<TimerBar
  total={300}           // 5 minutes in seconds
  warning={60}          // turns amber at 60s
  danger={20}           // turns red at 20s, starts pulsing
/>
```

- Progress bar เต็มความกว้าง, ค่อย ๆ หดลง
- สี: Green → Amber → Red พร้อม pulse animation
- แสดง `mm:ss` countdown

### 5.6 Toast Notifications (Jasper-style)

วางที่ top-center, slide-in จากบน:

| Type | Color | Use case |
|------|-------|----------|
| Success | #10D98A | Payment confirmed, order saved |
| Error | #FF4757 | QR expired, confirm failed |
| Warning | #F5A623 | QR เหลือเวลาน้อย |
| Info | #4FC3F7 | Printer offline |

Auto-dismiss ใน 4 วินาที, มีปุ่ม X ปิดเอง

### 5.7 Status Badges

```
PENDING    -> bg: #252540, text: #A0A0B8, border: #4A4A6A
COMPLETED  -> bg: #0D3B26, text: #10D98A, border: #10D98A
CANCELLED  -> bg: #3B1515, text: #FF4757, border: #FF4757
REFUNDED   -> bg: #3B2A0D, text: #F5A623, border: #F5A623
```

### 5.8 Receipt Preview (Modal)

- พื้นหลัง `#FFFFFF` เสมอ (สำหรับ print)
- Font: `IBM Plex Mono` — ให้ความรู้สึก thermal printer
- ขนาด 80mm column (ประมาณ 48 char/line)
- ปุ่ม "Print" trigger `window.print()` หรือ ESC/POS command

---

## 6. Page-by-Page Design Spec

### 6.1 Login Page

**Mood**: dim minimal, professional — เหมือน Jasper login screen

```
┌─────────────────────────────────────────┐
│                                         │
│         [LOGO] ร้าน Sandwich & Coffee   │
│                                         │
│         ┌───────────────────────┐       │
│         │  Email / Username     │       │
│         └───────────────────────┘       │
│                                         │
│         ┌───────────────────────┐       │
│         │  Password             │       │
│         └───────────────────────┘       │
│                                         │
│         [       เข้าสู่ระบบ       ]     │
│                                         │
└─────────────────────────────────────────┘
```

- พื้นหลัง `--color-bg-primary` ทั้งหน้า
- Form card: `--color-bg-surface` rounded-xl
- ไม่มี "สมัครสมาชิก" — ระบบปิด admin จัดการ

### 6.2 POS Main (Cashier)

**Layout**: Split-panel 60/40 ตามแผนภาพ Section 4.1

**Category Tab Bar**:
- Horizontal scroll tabs
- Active tab: สีขาว + underline accent-primary
- เลือก "ทั้งหมด" เป็น default

**Product Grid**:
- 3 columns บน tablet landscape (4 col บน wide screen)
- Gap: `--space-4`
- Infinite scroll หรือ pagination ภายใน category

**Cart Panel**:
- Fixed, ไม่ scroll ทั้งหน้า — cart scroll เฉพาะ items list
- Sticky order total + payment buttons ด้านล่าง

### 6.3 QR Payment Screen

- Full screen overlay (z-index สูงสุด)
- QR image กลางจอ ขนาด 240px x 240px ขั้นต่ำ
- ยอดเงินแสดง `--text-3xl` + `--font-display`
- Ref code: `--font-mono`, `--color-accent-info`
- Timer bar อยู่ด้านล่าง QR
- ปุ่ม "ยืนยันชำระแล้ว" — full width, 72px height, สีเขียว
- ปุ่ม "สร้าง QR ใหม่" — แสดงเมื่อ expired เท่านั้น (replace timer)

### 6.4 Receipt Modal

- Overlay semi-opaque backdrop
- Receipt card: max-width 380px, centered
- 2 actions: "Print" (primary) และ "ปิด" (ghost)
- หลัง print -> auto return to POS หน้าใหม่ (order cleared)

### 6.5 Admin Dashboard

**KPI Cards** (Jasper-style stat blocks):
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Today Sales │  │ Orders      │  │ Avg Value   │  │ Top Product │
│             │  │             │  │             │  │             │
│  ฿12,450   │  │    48 บิล   │  │   ฿259/บิล  │  │ Americano   │
│ +12% vs    │  │             │  │             │  │ 89 แก้ว     │
│  เมื่อวาน   │  │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

- card bg: `--color-bg-surface`
- number: `--font-display`, `--text-2xl`, `--color-accent-primary`
- trend badge: สีเขียว/แดงตาม direction

**Chart Section**:
- Sales by hour: Bar chart (recharts หรือ chart.js)
- Payment breakdown: Donut chart พร้อม legend
- สี chart: ใช้ accent palette ที่กำหนด

### 6.6 Admin Product Management

**Table View** (desktop):
```
[+ เพิ่มสินค้า]                          [Search]  [Category v]
────────────────────────────────────────────────────────────────
#  │ รูป │ ชื่อสินค้า    │ Category │ ราคา  │ Active │ Actions
────────────────────────────────────────────────────────────────
1  │ IMG │ Americano    │ Coffee   │ ฿65   │  ON   │ Edit Del
2  │ IMG │ BLT Sandwich │ Sandwich │ ฿90   │  ON   │ Edit Del
```

**Add/Edit Product Panel**:
- Slide-in panel จากขวา (ไม่ใช่ full modal เพื่อ context)
- Image upload zone: drag & drop
- Toggle switch สำหรับ is_active (ชัดเจน)

### 6.7 Admin Reports

**Filter Bar** (Jasper-style toolbar):
```
[วันนี้] [สัปดาห์นี้] [เดือนนี้] [กำหนดเอง]   [Cashier v] [Method v]  [Export]
```

- Filters ทำงาน real-time (หรือมีปุ่ม Apply)
- ผลลัพธ์แสดงทั้ง chart + table ด้านล่าง

---

## 7. Interaction & Motion Design

### 7.1 Micro-interactions (เลียนแบบ Jasper responsiveness)

| Action | Animation |
|--------|-----------|
| Tap product card | scale(0.94) -> scale(1) ใน 150ms + item เพิ่มใน cart (slide-in) |
| กด [+] / [-] | number flip animation (CSS counter) |
| ยืนยัน payment | Fullscreen success burst (circle expand + checkmark draw) |
| QR timer ใกล้หมด | pulse glow สีแดงบน timer |
| Toast appear | slide + fade in จาก top, 300ms |

### 7.2 Loading States

- **Skeleton screens** สำหรับ product grid load ครั้งแรก
- **Spinner** ขนาดเล็กใน button ขณะ API call (replace icon ชั่วคราว)
- **Optimistic UI**: เพิ่ม item ใน cart ทันที ก่อน API confirm

### 7.3 Error States

- **Form validation**: inline error ใต้ field (ไม่ใช่ alert popup)
- **API error**: Toast แดง + retry action ถ้าเป็นไปได้
- **QR expired**: Banner สีแดงบน QR screen พร้อมปุ่ม "สร้างใหม่"
- **Printer offline**: Warning persistent banner (ไม่ block workflow)

---

## 8. Responsive & Touch Considerations

### 8.1 Target Devices

| Device | Resolution | Use Case |
|--------|-----------|----------|
| iPad (landscape) | 1024x768 | POS Cashier — PRIMARY |
| iPad (portrait) | 768x1024 | ใช้ได้ แต่ไม่แนะนำ |
| Desktop 1280px+ | 1280x800+ | Admin Panel — PRIMARY |
| Mobile | < 768px | ไม่รองรับ (scope ปัจจุบัน) |

### 8.2 Touch Target Rules

- ปุ่มทุกปุ่ม: min `56px x 56px`
- Product card: min `140px x 160px`
- Cart item [-] [+]: min `48px x 48px`
- Spacing ระหว่าง tap targets: min `8px`

### 8.3 Gesture Support

- Cart items: swipe-left เพื่อ delete (mobile-pattern แต่ใช้ได้บน touch tablet)
- Product grid: scroll ด้วย swipe ตามปกติ
- Modal/overlay: tap backdrop เพื่อ dismiss (ยกเว้น payment modal)

---

## 9. Accessibility

- Contrast ratio >= 4.5:1 สำหรับ body text (AA)
- Contrast ratio >= 7:1 สำหรับ price/total (AAA)
- Focus visible ทุก element (`--color-border-focus` outline)
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`
- ARIA labels สำหรับ icon-only buttons
- Error messages: `role="alert"` + `aria-live="polite"`

---

## 10. Screen Flow Diagram

```
[Login]
   |
   v
[POS Main — Cashier View]
   |
   +--- เลือกสินค้า ---> [Cart Updates Real-time]
   |
   +--- กด "Cash" ---> [Enter Cash Modal]
   |                        |
   |                        v
   |                   [Payment Success]
   |                        |
   |                        v
   |                   [Receipt Modal]
   |                        |
   |                        v
   |                   [POS ใหม่ / Clear]
   |
   +--- กด "QR Pay" ---> [QR Payment Screen]
                              |
                    +---------+
                    |         |
               [Timer OK] [Timer Expired]
                    |         |
               [Cashier   [Generate New QR]
               ยืนยัน]
                    |
                    v
              [Payment Success]
                    |
                    v
              [Receipt Modal]


[Admin Login]
   |
   v
[Admin Dashboard]
   |
   +-> [Product Management]
   +-> [User Management]
   +-> [Reports]
   +-> [Settings (QR/Payment)]
   +-> [Shift Management]
   +-> [Audit Logs]
```

---

## 11. Component Library Mapping

แนะนำให้ใช้ library ต่อไปนี้เพื่อ implement ได้เร็ว:

| Component | Library | หมายเหตุ |
|-----------|---------|---------|
| UI Base | shadcn/ui | ปรับ theme ด้วย CSS variables ข้างต้น |
| Charts | recharts | Sales chart, Payment donut |
| QR Code | qrcode.react | Generate QR ฝั่ง client จาก payload |
| Date/Time | date-fns | Format Thai locale |
| Icons | Lucide React | Consistent icon set |
| Animation | Framer Motion | Page transition, toast, modal |
| Table | TanStack Table | Reports, product list |
| Form | React Hook Form + Zod | Validation |

---

## 12. Design Token Summary (Quick Reference)

```
PRIMARY DARK     #0F0F1A    <- Background
SURFACE          #1A1A2E    <- Cards
ELEVATED         #252540    <- Modal, active

ACCENT ORANGE    #FF6B35    <- Primary CTA, total price
ACCENT GREEN     #10D98A    <- Success, confirm, cash button
ACCENT AMBER     #F5A623    <- Warning, QR expiry
ACCENT RED       #FF4757    <- Error, cancel, danger
ACCENT BLUE      #4FC3F7    <- QR ref, info

TEXT PRIMARY     #F5F5F0    <- Main content
TEXT SECONDARY   #A0A0B8    <- Labels, muted

FONT DISPLAY     Sora              <- Price, numbers, headers
FONT BODY        IBM Plex Sans Thai <- Thai + English body text
FONT MONO        JetBrains Mono    <- Order numbers, ref codes

RADIUS LG        16px    <- Product cards
RADIUS XL        24px    <- Modals, panels
MIN TAP TARGET   56px    <- All interactive elements
```

---

> **Note**: Design นี้ออกแบบให้สอดคล้องกับ spec.md v1.0
> Phase 1 (POS + Payment) ให้ focus ที่ POS Main + QR Screen ก่อน
> Phase 2 (Admin) ให้ implement Admin Dashboard + Reports
> ทุก component ควร support dark mode as default โดยมี light mode เป็น option สำหรับ Admin panel
