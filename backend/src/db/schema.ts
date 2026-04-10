import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type BetterSqlite3 from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '..', 'pos.db');
const db: BetterSqlite3.Database = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CASHIER',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    name_snapshot TEXT NOT NULL,
    price_snapshot REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    reference_code TEXT,
    confirmed_by INTEGER,
    confirmed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (confirmed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS payment_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_id INTEGER NOT NULL,
    key_name TEXT NOT NULL,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (method_id) REFERENCES payment_methods(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_by INTEGER NOT NULL,
    closed_by INTEGER,
    opening_cash REAL NOT NULL DEFAULT 0,
    closing_cash REAL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    opened_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    closed_at TEXT,
    FOREIGN KEY (opened_by) REFERENCES users(id),
    FOREIGN KEY (closed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cash_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id INTEGER,
    entity TEXT,
    entity_id INTEGER,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ── Indexes ────────────────────────────────────────────────────────────

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
  CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
  CREATE INDEX IF NOT EXISTS idx_discounts_order_id ON discounts(order_id);
  CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
  CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
  CREATE INDEX IF NOT EXISTS idx_cash_adjustments_shift_id ON cash_adjustments(shift_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_settings_key_name ON settings(key_name);
  CREATE INDEX IF NOT EXISTS idx_payment_configs_method_id ON payment_configs(method_id);
`);

export default db;
