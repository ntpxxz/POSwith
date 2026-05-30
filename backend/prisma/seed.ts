import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@pos.com',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@pos.com' },
    update: {},
    create: {
      name: 'Cashier',
      email: 'cashier@pos.com',
      passwordHash: bcrypt.hashSync('cashier123', 10),
      role: Role.CASHIER,
    },
  });

  // ── Products ───────────────────────────────────────────────────────
  const coffees: { name: string; price: number }[] = [
    { name: 'Americano', price: 55 },
    { name: 'Latte', price: 65 },
    { name: 'Cappuccino', price: 65 },
    { name: 'Espresso', price: 45 },
    { name: 'Mocha', price: 70 },
    { name: 'Green Tea Latte', price: 65 },
    { name: 'Thai Tea', price: 50 },
    { name: 'Cocoa', price: 60 },
  ];

  for (const [i, item] of coffees.entries()) {
    await prisma.product.upsert({
      where: { id: i + 1 },
      update: {},
      create: { ...item, category: 'Coffee', sortOrder: i + 1 },
    });
  }

  const sandwiches: { name: string; price: number }[] = [
    { name: 'BLT Sandwich', price: 90 },
    { name: 'Club Sandwich', price: 110 },
    { name: 'Tuna Sandwich', price: 95 },
    { name: 'Egg Sandwich', price: 75 },
    { name: 'Ham & Cheese', price: 85 },
  ];

  for (const [i, item] of sandwiches.entries()) {
    await prisma.product.upsert({
      where: { id: coffees.length + i + 1 },
      update: {},
      create: { ...item, category: 'Sandwich', sortOrder: i + 1 },
    });
  }

  const bakery: { name: string; price: number }[] = [
    { name: 'Croissant', price: 55 },
    { name: 'Chocolate Muffin', price: 50 },
    { name: 'Banana Cake', price: 45 },
    { name: 'Cookie', price: 35 },
  ];

  for (const [i, item] of bakery.entries()) {
    await prisma.product.upsert({
      where: { id: coffees.length + sandwiches.length + i + 1 },
      update: {},
      create: { ...item, category: 'Bakery', sortOrder: i + 1 },
    });
  }

  // ── Payment Methods ────────────────────────────────────────────────
  await prisma.paymentMethod.upsert({
    where: { code: 'CASH' },
    update: {},
    create: { code: 'CASH', name: 'Cash', isActive: true, isDefault: true },
  });

  const qrMethod = await prisma.paymentMethod.upsert({
    where: { code: 'QR' },
    update: {},
    create: { code: 'QR', name: 'QR PromptPay', isActive: true },
  });

  await prisma.paymentMethod.upsert({
    where: { code: 'CARD' },
    update: {},
    create: { code: 'CARD', name: 'Credit/Debit Card', isActive: false },
  });

  // ── Payment Configs (QR) ───────────────────────────────────────────
  const qrConfigs = [
    { keyName: 'promptpay_id', value: '0812345678' },
    { keyName: 'account_name', value: 'Sandwich & Coffee' },
    { keyName: 'timeout_seconds', value: '300' },
  ];

  for (const config of qrConfigs) {
    const existing = await prisma.paymentConfig.findFirst({
      where: { methodId: qrMethod.id, keyName: config.keyName },
    });
    if (!existing) {
      await prisma.paymentConfig.create({
        data: { methodId: qrMethod.id, ...config },
      });
    }
  }

  // ── Settings ───────────────────────────────────────────────────────
  const settings: { keyName: string; value: string }[] = [
    { keyName: 'SHOP_NAME', value: 'Sandwich & Coffee' },
    { keyName: 'RECEIPT_FOOTER', value: 'ขอบคุณที่อุดหนุน' },
    { keyName: 'TAX_PERCENT', value: '0' },
    { keyName: 'AUTO_PRINT_RECEIPT', value: 'true' },
    { keyName: 'DEFAULT_PAYMENT_METHOD', value: 'CASH' },
    { keyName: 'QR_ACCOUNT_NAME', value: 'Sandwich & Coffee' },
    { keyName: 'QR_PROMPTPAY_ID', value: '0812345678' },
    { keyName: 'QR_TIMEOUT_SECONDS', value: '300' },
    { keyName: 'PRINTER_ENABLED', value: 'false' },
    { keyName: 'PRINTER_TYPE', value: 'EPSON' },
    { keyName: 'PRINTER_INTERFACE', value: 'tcp://192.168.1.100:9100' },
    { keyName: 'PRINTER_CHAR_SET', value: 'WPC1252' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { keyName: setting.keyName },
      update: {},
      create: setting,
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
