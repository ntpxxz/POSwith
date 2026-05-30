---
name: code-review-fixes-complete
description: All 14 original code review fixes applied, plus 10 additional bugs found and fixed across auth, payments, print, and frontend api.
metadata:
  type: project
---

User ran /code-reviewer, then asked to fix all 14 issues. Work was interrupted mid-fix. Resume by continuing the edits described below.

**Why:** All 14 issues were identified in a code review of the two git-modified files on branch `claude/continue-work-YB1EI`.

**How to apply:** Continue with the remaining fixes listed below. Do NOT redo the completed ones — those edits are already written to disk.

---

## Files being edited
- `backend/src/routes/admin.ts`
- `backend/src/routes/orders.ts`

---

## ✅ COMPLETED (admin.ts)

1. **bcrypt.hashSync → await bcrypt.hash()** — `POST /users` and `PUT /users/:id` (issues 1)
2. **Removed dead `DELETE /users/:id` endpoint** — frontend uses PUT for toggle; no audit log either (issues 6 & 7)
3. **Added required-field validation** to `POST /products` — name, category, price (issue 2)
4. **Added 404 check** before `PUT /products/:id` update (issue 3)
5. **Added 404 check** before `DELETE /products/:id` update (issue 3)
6. **Fixed `normalizePM` type** — replaced `any` with `PaymentMethodWithConfigs = Prisma.PaymentMethodGetPayload<{ include: { configs: true } }>` (issue 11)
7. **Wrapped payment method update + configs in `$transaction`** — also moved audit log inside the transaction (issues 4 & 13 combined)

---

## ❌ REMAINING (admin.ts)

### Issue 13 — Settings audit log outside transaction
In `PUT /settings` (around line 279), the `prisma.$transaction(settings.map(...))` uses the batch array form. Change to callback form and move `auditLog.create` inside:

```ts
await prisma.$transaction(async (tx) => {
  await Promise.all(
    settings.map((s: { key_name: string; value: string }) =>
      tx.setting.upsert({
        where: { keyName: s.key_name },
        update: { value: s.value },
        create: { keyName: s.key_name, value: s.value },
      })
    )
  );
  await tx.auditLog.create({
    data: { action: 'UPDATE_SETTINGS', userId: req.user!.id, entity: 'settings', payload: settings },
  });
});
// Remove the separate auditLog.create that follows
```

### Issue 11 (admin.ts) — `dateWhere: any` in staff report
In `GET /reports/staff`, change:
```ts
const dateWhere: any = start_date || end_date ? { ... } : {};
```
to:
```ts
const dateWhere: { createdAt?: { gte?: Date; lte?: Date } } = start_date || end_date ? { ... } : {};
```

### Issue 12 — N+1 queries in staff report
Replace the entire `GET /reports/staff` handler body. Instead of one set of 4 queries per cashier (4×N total), use 4 bulk queries + in-memory aggregation:

```ts
const cashierIds = cashiers.map(c => c.id);
if (cashierIds.length === 0) { res.json({ staff: [] }); return; }

const orderWhere = { status: 'COMPLETED' as const, createdById: { in: cashierIds }, ...dateWhere };

const [orderGroups, discountRows, refundRows, paymentRows] = await Promise.all([
  prisma.order.groupBy({
    by: ['createdById'],
    where: orderWhere,
    _count: true,
    _sum: { netAmount: true },
    _avg: { netAmount: true },
  }),
  prisma.discount.findMany({
    where: { order: orderWhere },
    select: { value: true, order: { select: { createdById: true } } },
  }),
  prisma.refund.findMany({
    where: { order: { createdById: { in: cashierIds }, ...dateWhere } },
    select: { amount: true, order: { select: { createdById: true } } },
  }),
  prisma.payment.findMany({
    where: { status: 'SUCCESS', order: { createdById: { in: cashierIds }, ...dateWhere } },
    select: { method: true, order: { select: { createdById: true } } },
  }),
]);

const orderMap = new Map(orderGroups.map(g => [g.createdById, g]));

const discountByStaff = new Map<number, number>();
for (const d of discountRows) {
  const uid = d.order.createdById;
  discountByStaff.set(uid, (discountByStaff.get(uid) ?? 0) + Number(d.value));
}

const refundCountByStaff = new Map<number, number>();
const refundAmountByStaff = new Map<number, number>();
for (const r of refundRows) {
  const uid = r.order.createdById;
  refundCountByStaff.set(uid, (refundCountByStaff.get(uid) ?? 0) + 1);
  refundAmountByStaff.set(uid, (refundAmountByStaff.get(uid) ?? 0) + Number(r.amount));
}

const cashOrdersByStaff = new Map<number, number>();
const qrOrdersByStaff = new Map<number, number>();
for (const p of paymentRows) {
  const uid = p.order.createdById;
  if (p.method === 'CASH') cashOrdersByStaff.set(uid, (cashOrdersByStaff.get(uid) ?? 0) + 1);
  if (p.method === 'QR') qrOrdersByStaff.set(uid, (qrOrdersByStaff.get(uid) ?? 0) + 1);
}

const staffData = cashiers.map(cashier => {
  const stats = orderMap.get(cashier.id);
  return {
    userId: cashier.id,
    userName: cashier.name,
    totalOrders: stats?._count ?? 0,
    totalSales: Number(stats?._sum.netAmount ?? 0),
    avgOrderValue: Number(stats?._avg.netAmount ?? 0),
    cashOrders: cashOrdersByStaff.get(cashier.id) ?? 0,
    qrOrders: qrOrdersByStaff.get(cashier.id) ?? 0,
    discountGiven: discountByStaff.get(cashier.id) ?? 0,
    refundCount: refundCountByStaff.get(cashier.id) ?? 0,
    refundAmount: refundAmountByStaff.get(cashier.id) ?? 0,
  };
});

res.json({ staff: staffData.sort((a, b) => b.totalSales - a.totalSales) });
```

---

## ❌ REMAINING (orders.ts)

### Issue 11 (orders.ts) — `any` types for order items
Add interface before the router, then replace `(item: any)` usages:

```ts
interface OrderItemInput {
  productId?: number;
  product_id?: number;
  quantity?: number;
}
```
Use `(items as OrderItemInput[])` in the POST / handler.

### Issue 5 — Zero/negative quantity not validated
In `POST /`, after the `productMap.has(productId)` check loop, add per-item quantity validation before computing `orderItemsData`:

```ts
for (const item of items as OrderItemInput[]) {
  const qty = Number(item.quantity ?? 1);
  if (!Number.isInteger(qty) || qty < 1) {
    res.status(400).json({ error: `Invalid quantity for product ${Number(item.productId ?? item.product_id)}` });
    return;
  }
}
```
And change `const quantity = item.quantity || 1;` to `const quantity = Number(item.quantity ?? 1);`

### Issue 8 — Status not validated in `GET /orders`
Change:
```ts
if (status) where.status = status;
```
to:
```ts
const VALID_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
if (status) {
  if (!VALID_STATUSES.includes(status as string)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  where.status = status as any;
}
```

### Issue 9 — Date not validated in `GET /orders`
Change:
```ts
const d = new Date(date as string);
const next = new Date(d);
next.setDate(next.getDate() + 1);
where.createdAt = { gte: d, lt: next };
```
to:
```ts
const d = new Date(date as string);
if (isNaN(d.getTime())) {
  res.status(400).json({ error: 'Invalid date format' });
  return;
}
const next = new Date(d);
next.setDate(next.getDate() + 1);
where.createdAt = { gte: d, lt: next };
```

### Issue 10 — Multiple discount records accumulate per order
In `POST /:id/discount`, inside the `$transaction`, delete existing discounts before creating a new one:

```ts
const updated = await prisma.$transaction(async (tx) => {
  await tx.discount.deleteMany({ where: { orderId: id } });  // ← add this line
  await tx.discount.create({
    data: { orderId: id, type, value, createdById: req.user!.id },
  });
  const o = await tx.order.update({ ... });
  await tx.auditLog.create({ ... });
  return o;
});
```

---

## Notes
- Issue 14 (netTotal naming): NO CHANGE — `netTotal` is already consistent across all API responses and frontend types (`Order.netTotal`, `AdminOrder.netTotal`). Changing it would be a breaking rename.
- The interrupted edit was the settings transaction (issue 13). Check admin.ts around the `PUT /settings` route to confirm whether that partial change was written or rolled back.
