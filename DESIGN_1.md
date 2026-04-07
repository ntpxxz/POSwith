# 🎨 UI Design System: Mid-Century Modern POS

เอกสารนี้ระบุถึงแนวทางการออกแบบ (Design Guidelines) สำหรับระบบ Point of Sale (POS) โดยใช้สไตล์ **Mid-Century Modern (MCM)** ซึ่งเน้นความเรียบง่าย รูปทรงเรขาคณิตที่ชัดเจน โทนสีที่อบอุ่นเป็นธรรมชาติ และฟังก์ชันการใช้งานที่ตรงไปตรงมา

## 📌 1. Design Principles (หลักการออกแบบ)

* **Form Follows Function:** ความสวยงามต้องไม่เป็นอุปสรรคต่อความเร็วในการกดจิ้มหน้าจอของแคชเชียร์ ปุ่มต้องใหญ่และอ่านง่าย
* **Warm & Earthy:** ใช้โทนสีที่ให้ความรู้สึกอบอุ่น คลาสสิก เช่น ส้มอิฐ เหลืองมัสตาร์ด และเขียวมะกอก
* **Clean Geometry:** ใช้รูปทรงเรขาคณิตที่ชัดเจน (สี่เหลี่ยม มุมมนเล็กน้อย วงกลม) ไม่ใช้เอฟเฟกต์ 3D หรือ Gradient ที่ซับซ้อน เน้นความแบน (Flat) หรือ Solid Shadow บางๆ

---

## 🎨 2. Color Palette (ชุดสี)

สีในสไตล์ Mid-Century จะมีความตุ่นและเป็นธรรมชาติ (Muted & Earthy) เราจะแบ่งสีออกตามฟังก์ชันการใช้งานใน POS ดังนี้:

### Background & Surface
* **Base Background:** `#F4F1EA` (สีครีมกระดาษ/ออฟไวท์) - ให้ความรู้สึกสบายตา ไม่สว่างจ้าเกินไป
* **Card/Panel Surface:** `#FFFFFF` หรือ `#EBE7DD` - สำหรับแยกโซนรายการสินค้าและเมนู
* **Dark Surface (Sidebar/Header):** `#2C2B29` (สีเทาดำอมน้ำตาล) - สื่อถึงสีของไม้เข้ม (Walnut)

### Accent & Action Colors (สีปุ่มและจุดเด่น)
* **Primary Action (ชำระเงิน / ตกลง):** `#C85A17` (Burnt Orange / ส้มอิฐ)
* **Secondary Action (ปุ่มเมนูทั่วไป):** `#3B7A89` (Teal / ฟ้าอมเขียว)
* **Success (เพิ่มสินค้าสำเร็จ):** `#647659` (Olive Green / เขียวมะกอก)
* **Warning / Hold (พักบิล / ลบรายการ):** `#DDA77B` (Mustard Yellow / เหลืองมัสตาร์ด)
* **Danger / Cancel (ยกเลิกบิล):** `#A93F35` (Terracotta Red / แดงดินเผา)

### Typography Colors
* **Primary Text:** `#222222` (สีดำที่ไม่ดำสนิท)
* **Secondary Text:** `#666666`

---

## ✍️ 3. Typography (แบบอักษร)

สไตล์ Mid-Century นิยมใช้ฟอนต์ตระกูล Geometric Sans-serif ที่ดูสะอาดตาและทันสมัย(ในยุคนั้น)
* **Primary Font (EN):** `Futura`, `Montserrat` หรือ `Jost`
* **Primary Font (TH):** `Prompt`, `Kanit` หรือ `Sarabun` (เน้นตัวที่หัวกลมและอ่านง่าย)

**Hierarchy:**
* `H1` (ยอดรวมเงิน): 36px - 48px, Bold, สี Burnt Orange หรือ สีดำ
* `H2` (หัวข้อหมวดหมู่): 24px, Semi-Bold
* `Body` (ชื่อสินค้า): 16px - 18px, Regular
* `Caption` (รายละเอียด/SKU): 12px - 14px, Regular, สี Secondary Text

---

## 🧩 4. UI Components (องค์ประกอบหน้าจอ)

### Buttons (ปุ่มกด)
เนื่องจากเป็น POS ปุ่มต้องออกแบบมาเพื่อการสัมผัส (Touch-friendly):
* **Shape:** สี่เหลี่ยมผืนผ้า ขอบมนเล็กน้อย (Border-Radius: `4px` หรือ `8px`) เพื่อรักษาความคมชัดแบบเรขาคณิต
* **Style:** พื้นสีทึบ (Solid color) ไม่มี Gradient 
* **Shadow:** ใช้เงาแบบขอบแข็ง (Hard shadow) เลื่อนลงมาเล็กน้อย เช่น `box-shadow: 2px 2px 0px #2C2B29;` เพื่อให้กลิ่นอายความเรโทร หรือใช้ Flat ไม่มีเงาเลยก็ได้
* **Minimum Touch Target:** อย่างน้อย `48x48 px`

### Cards & Product Grids (การ์ดสินค้า)
* **Border:** เส้นขอบบางๆ `1px solid #D5D1C8` หรือใช้พื้นหลังสีขาวเพื่อแยกตัวจากการ์ดสีออฟไวท์
* **Image:** ภาพสินค้าควรไดคัทพื้นหลัง หรือใส่บนพื้นหลังสีพาสเทลอ่อนๆ ที่เข้ากับธีม
* **Padding:** ใช้พื้นที่ว่าง (White space) ให้เพียงพอ ไม่ดูอึดอัด (`padding: 16px`)

### Inputs & Forms (ช่องกรอกข้อมูล/ค้นหา)
* พื้นหลังสี `#FFFFFF`
* เส้นขอบสี `#D5D1C8` 
* เมื่อ Focus ให้เปลี่ยนเส้นขอบเป็นสี `#3B7A89` (Teal)

---

## 📐 5. Layout & Spacing (การจัดวาง)

* **Grid System:** ใช้ Grid แบบ 12-column หรือ 8-point grid system
* **POS Structure:** * **Left/Top:** หมวดหมู่สินค้า (Categories) รูปแบบแท็บหรือแถบด้านข้างที่ชัดเจน
    * **Center:** ตารางสินค้า (Product Grid) แสดงรูปและราคาชัดเจน
    * **Right:** ใบเสร็จ/ตะกร้าสินค้า (Cart/Ticket) พื้นที่ดูสะอาดตา ตัวเลขยอดรวมโดดเด่น

---

## 💡 6. Iconography (ไอคอน)

* ใช้ไอคอนแบบเส้น (Line icons) หรือแบบทึบ (Solid) ที่มีลายเส้นความหนาสม่ำเสมอ (Monoline)
* หลีกเลี่ยงไอคอนที่มีรายละเอียดเยอะเกินไป ให้เน้นความมินิมอล
* ตัวอย่างเซ็ตไอคอนที่เหมาะสม: *Phosphor Icons*, *Feather Icons*, หรือ *Material Symbols* แบบปรับขอบมน

---

## 🚀 7. Accessibility (การเข้าถึง)

* **Contrast Ratio:** ตรวจสอบให้สีตัวอักษรและสีพื้นหลังมีค่าความต่าง (Contrast) เพียงพอเพื่อให้แคชเชียร์อ่านได้ชัดเจนในสภาพแสงจ้า
* **Feedback:** ทุกครั้งที่มีการกดปุ่ม (Tap) ต้องมีการตอบสนองทางภาพ (Visual feedback) เช่น ปุ่มยุบลง หรือเปลี่ยนสีเข้มขึ้น เพื่อให้ผู้ใช้รู้ว่าระบบรับคำสั่งแล้ว