import db from './schema.js';
import bcrypt from 'bcryptjs';

export function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database...');

  const salt = bcrypt.genSaltSync(10);

  // ── Users ──────────────────────────────────────────────────────────
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('Admin', 'admin@pos.com', bcrypt.hashSync('admin123', salt), 'ADMIN');
  insertUser.run('Cashier', 'cashier@pos.com', bcrypt.hashSync('cashier123', salt), 'CASHIER');

  // ── Products ───────────────────────────────────────────────────────
  const insertProduct = db.prepare(
    'INSERT INTO products (name, category, price, sort_order) VALUES (?, ?, ?, ?)'
  );

  const coffees: [string, number][] = [
    ['Americano', 55], ['Latte', 65], ['Cappuccino', 65], ['Espresso', 45],
    ['Mocha', 70], ['Green Tea Latte', 65], ['Thai Tea', 50], ['Cocoa', 60],
  ];
  coffees.forEach(([name, price], i) => insertProduct.run(name, 'Coffee', price, i + 1));

  const sandwiches: [string, number][] = [
    ['BLT Sandwich', 90], ['Club Sandwich', 110], ['Tuna Sandwich', 95],
    ['Egg Sandwich', 75], ['Ham & Cheese', 85],
  ];
  sandwiches.forEach(([name, price], i) => insertProduct.run(name, 'Sandwich', price, i + 1));

  const bakery: [string, number][] = [
    ['Croissant', 55], ['Chocolate Muffin', 50], ['Banana Cake', 45], ['Cookie', 35],
  ];
  bakery.forEach(([name, price], i) => insertProduct.run(name, 'Bakery', price, i + 1));

  // ── Payment Methods ────────────────────────────────────────────────
  const insertMethod = db.prepare(
    'INSERT INTO payment_methods (code, name, is_active) VALUES (?, ?, ?)'
  );
  insertMethod.run('CASH', 'Cash', 1);
  const qrResult = insertMethod.run('QR', 'QR PromptPay', 1);
  insertMethod.run('CARD', 'Credit/Debit Card', 0);

  const qrMethodId = qrResult.lastInsertRowid;

  // ── Payment Configs (QR) ───────────────────────────────────────────
  const insertConfig = db.prepare(
    'INSERT INTO payment_configs (method_id, key_name, value) VALUES (?, ?, ?)'
  );
  insertConfig.run(qrMethodId, 'promptpay_id', '0812345678');
  insertConfig.run(qrMethodId, 'account_name', 'Sandwich & Coffee');
  insertConfig.run(qrMethodId, 'timeout_seconds', '300');

  // ── Settings ───────────────────────────────────────────────────────
  const insertSetting = db.prepare(
    'INSERT INTO settings (key_name, value) VALUES (?, ?)'
  );
  const settingsData: [string, string][] = [
    ['SHOP_NAME', 'Sandwich & Coffee'],
    ['RECEIPT_FOOTER', 'ขอบคุณที่อุดหนุน'],
    ['TAX_PERCENT', '0'],
    ['AUTO_PRINT_RECEIPT', 'true'],
    ['DEFAULT_PAYMENT_METHOD', 'CASH'],
    ['QR_ACCOUNT_NAME', 'Sandwich & Coffee'],
    ['QR_PROMPTPAY_ID', '0812345678'],
    ['QR_TIMEOUT_SECONDS', '300'],
  ];
  settingsData.forEach(([key, value]) => insertSetting.run(key, value));

  console.log('Database seeded successfully.');
}

// Allow running directly: npx tsx src/db/seed.ts
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  seed();
}
