/* eslint-disable */
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

let db = null;
let SQL = null;
let dbPath = null;

const initialize = async () => {
  try {
    const { app } = require("electron");
    dbPath = path.join(app.getPath("userData"), "postore.db");

    // Load sql.js
    const initSqlJs = require("sql.js");
    SQL = await initSqlJs();

    // Load existing database if it exists
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    createTables();
    log.info("Database initialized at:", dbPath);
    return { success: true };
  } catch (error) {
    log.error("Database initialization failed:", error);
    return { success: false, error: error.message };
  }
};

const save = () => {
  try {
    if (db && dbPath) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    log.error("Database save failed:", error);
  }
};

const createTables = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      full_name     TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'staff',
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT,
      description TEXT,
      price       REAL NOT NULL,
      stock       INTEGER DEFAULT 0,
      sku         TEXT,
      emoji       TEXT,
      image       TEXT,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id             TEXT PRIMARY KEY,
      order_number   TEXT UNIQUE NOT NULL,
      staff_id       TEXT,
      staff_name     TEXT,
      subtotal       REAL NOT NULL,
      tax            REAL DEFAULT 0,
      discount       REAL DEFAULT 0,
      discount_applied REAL DEFAULT 0,
      total          REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      mpesa_amount   REAL DEFAULT 0,
      cash_amount    REAL DEFAULT 0,
      mpesa_receipt  TEXT,
      status         TEXT DEFAULT 'completed',
      notes          TEXT,
      created_at     TEXT DEFAULT (datetime('now')),
      synced         INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           TEXT PRIMARY KEY,
      order_id     TEXT NOT NULL,
      product_id   TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity     INTEGER NOT NULL,
      unit_price   REAL NOT NULL,
      total_price  REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      category      TEXT,
      contact_name  TEXT,
      email         TEXT,
      phone         TEXT,
      address       TEXT,
      city          TEXT,
      country       TEXT,
      tax_number    TEXT,
      payment_terms TEXT,
      credit_limit  REAL DEFAULT 0,
      balance_due   REAL DEFAULT 0,
      status        TEXT DEFAULT 'active',
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  save();

  // Ensure new columns exist in older DBs (safe ALTERs)
  try {
    db.run("ALTER TABLE orders ADD COLUMN discount_applied REAL DEFAULT 0;");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN mpesa_amount REAL DEFAULT 0;");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN cash_amount REAL DEFAULT 0;");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN mpesa_receipt TEXT;");
  } catch (e) {}
  try {
    db.run("ALTER TABLE products ADD COLUMN image TEXT;");
  } catch (e) {}
  save();
};

const query = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, data: rows };
  } catch (error) {
    log.error("Query error:", error);
    return { success: false, error: error.message, data: [] };
  }
};

const execute = (sql, params = []) => {
  try {
    db.run(sql, params);
    save(); // persist after every write
    return { success: true, changes: db.getRowsModified() };
  } catch (error) {
    log.error("Execute error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { initialize, query, execute, save };