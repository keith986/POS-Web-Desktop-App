import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

export async function initDb(): Promise<void> {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
  });

  console.log(" Connected to MySQL server...");

  const dbName = process.env.DB_NAME || "pos_db";

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.query(`USE \`${dbName}\``);
  console.log(`✅ Database '${dbName}' ready`);

  // ── TABLES ──────────────────────────────────────────

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id               CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
      full_name        VARCHAR(100) NOT NULL,
      email            VARCHAR(150) NOT NULL UNIQUE,
      password         VARCHAR(255) NOT NULL,
      role             ENUM('admin','staff','client') DEFAULT 'client',
      is_super_admin   BOOLEAN      DEFAULT FALSE,
      store_name       VARCHAR(100) NULL,
      domain           VARCHAR(100) NULL UNIQUE,
      pos_type         ENUM('retail','restaurant','salon','wholesale','pharmacy') NULL DEFAULT NULL,
      subdomain_url    VARCHAR(255) NULL DEFAULT NULL,
      subdomain_status ENUM('active','pending','failed') NULL DEFAULT NULL,
      created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Table: users");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id         CHAR(36)     NOT NULL PRIMARY KEY,
      full_name  VARCHAR(100) NOT NULL,
      email      VARCHAR(150) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      admin_id   CHAR(36)     NOT NULL,
      shift_role ENUM('staff') DEFAULT 'staff',
      status     ENUM('active','inactive') DEFAULT 'active',
      last_login TIMESTAMP    NULL DEFAULT NULL,
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id)
    )
  `);
  console.log("✅ Table: staff");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          VARCHAR(36)   NOT NULL PRIMARY KEY,
      name        VARCHAR(255)  NOT NULL,
      category    VARCHAR(100)  NOT NULL,
      price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      stock       INT           NOT NULL DEFAULT 0,
      sku         VARCHAR(100)  NULL,
      description TEXT          NULL,
      image       LONGTEXT      NULL,
      status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
      admin_id    VARCHAR(36)   NOT NULL,
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_category (category),
      INDEX idx_status   (status)
    )
  `);
  console.log("✅ Table: products");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id          VARCHAR(36)  NOT NULL PRIMARY KEY,
      product_id  VARCHAR(36)  NOT NULL,
      type        ENUM('restock','adjustment','sale','return') NOT NULL,
      quantity    INT          NOT NULL,
      note        TEXT         NULL,
      admin_id    VARCHAR(36)  NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_id (product_id),
      INDEX idx_admin_id   (admin_id),
      INDEX idx_created_at (created_at)
    )
  `);
  console.log("✅ Table: stock_movements");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id             VARCHAR(36)   NOT NULL PRIMARY KEY,
      full_name      VARCHAR(255)  NOT NULL,
      email          VARCHAR(255)  NOT NULL,
      phone          VARCHAR(50)   NULL,
      status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
      total_orders   INT           NOT NULL DEFAULT 0,
      total_spent    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      loyalty_points INT           NOT NULL DEFAULT 0,
      admin_id       VARCHAR(36)   NOT NULL,
      last_order     TIMESTAMP     NULL,
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_email    (email),
      INDEX idx_status   (status)
    )
  `);
  console.log("✅ Table: customers");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id             VARCHAR(36)   NOT NULL PRIMARY KEY,
      order_number   VARCHAR(50)   NOT NULL UNIQUE,
      customer_id    VARCHAR(36)   NULL,
      customer_name  VARCHAR(255)  NOT NULL,
      customer_email VARCHAR(255)  NOT NULL DEFAULT '',
      items          JSON          NOT NULL,
      subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tax            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total          DECIMAL(12,2) NOT NULL,
      status         ENUM('pending','processing','completed','refunded','cancelled') NOT NULL DEFAULT 'pending',
      payment_method ENUM('card','cash','mobile') NOT NULL DEFAULT 'cash',
      payment_status ENUM('paid','pending','refunded') NOT NULL DEFAULT 'paid',
      staff_name     VARCHAR(255)  NULL,
      note           TEXT          NULL,
      admin_id       VARCHAR(36)   NOT NULL,
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id    (admin_id),
      INDEX idx_status      (status),
      INDEX idx_customer_id (customer_id),
      INDEX idx_created_at  (created_at)
    )
  `);
  console.log("✅ Table: orders");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id                    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      admin_id              CHAR(36)     NOT NULL UNIQUE,
      store_name            VARCHAR(100) DEFAULT 'POStore',
      domain                VARCHAR(100) DEFAULT 'postore',
      email                 VARCHAR(150) DEFAULT '',
      phone                 VARCHAR(50)  DEFAULT '',
      address               VARCHAR(255) DEFAULT '',
      currency              VARCHAR(10)  DEFAULT 'KES',
      timezone              VARCHAR(60)  DEFAULT 'Africa/Nairobi',
      tax_enabled           TINYINT(1)   DEFAULT 1,
      tax_rate              DECIMAL(5,2) DEFAULT 16.00,
      tax_name              VARCHAR(20)  DEFAULT 'VAT',
      tax_inclusive         TINYINT(1)   DEFAULT 0,
      receipt_footer        TEXT,
      notif_new_order       TINYINT(1)   DEFAULT 1,
      notif_low_stock       TINYINT(1)   DEFAULT 1,
      notif_daily_report    TINYINT(1)   DEFAULT 0,
      notif_staff_login     TINYINT(1)   DEFAULT 0,
      notif_email           VARCHAR(255) DEFAULT '',
      auto_deduct_inventory TINYINT(1)   DEFAULT 0,
      updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Table: settings");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`tables\` (
      id               VARCHAR(36)  NOT NULL PRIMARY KEY,
      table_number     INT          NOT NULL,
      label            VARCHAR(100) NOT NULL,
      capacity         INT          NOT NULL DEFAULT 4,
      status           ENUM('available','occupied','reserved','cleaning') NOT NULL DEFAULT 'available',
      section          VARCHAR(100) NOT NULL DEFAULT 'Main',
      current_order_id VARCHAR(36)  NULL DEFAULT NULL,
      admin_id         VARCHAR(36)  NOT NULL,
      updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_status   (status),
      INDEX idx_section  (section)
    )
  `);
  console.log("✅ Table: tables");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id           VARCHAR(36)   NOT NULL PRIMARY KEY,
      name         VARCHAR(255)  NOT NULL,
      description  TEXT          NULL,
      category     VARCHAR(100)  NOT NULL DEFAULT 'Other',
      price        DECIMAL(10,2) NOT NULL,
      cost         DECIMAL(10,2) NULL,
      calories     INT           NULL,
      prep_time    INT           NULL,
      is_available TINYINT(1)    NOT NULL DEFAULT 1,
      is_featured  TINYINT(1)    NOT NULL DEFAULT 0,
      tags         JSON          NULL,
      admin_id     VARCHAR(36)   NOT NULL,
      created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id  (admin_id),
      INDEX idx_category  (category),
      INDEX idx_available (is_available),
      INDEX idx_featured  (is_featured)
    )
  `);
  console.log("✅ Table: menu_items");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id             VARCHAR(36)   NOT NULL PRIMARY KEY,
      client_name    VARCHAR(255)  NOT NULL,
      client_phone   VARCHAR(50)   NULL,
      client_email   VARCHAR(255)  NULL,
      service_name   VARCHAR(255)  NOT NULL,
      service_id     VARCHAR(36)   NULL,
      staff_name     VARCHAR(255)  NULL,
      staff_id       VARCHAR(36)   NULL,
      date           DATE          NOT NULL,
      start_time     TIME          NOT NULL,
      end_time       TIME          NULL,
      duration       INT           NOT NULL DEFAULT 60,
      price          DECIMAL(10,2) NOT NULL DEFAULT 0,
      deposit        DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_status ENUM('unpaid','deposit','paid')                                              NOT NULL DEFAULT 'unpaid',
      status         ENUM('scheduled','confirmed','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
      type           ENUM('booked','walk_in')                                                     NOT NULL DEFAULT 'booked',
      notes          TEXT          NULL,
      admin_id       VARCHAR(36)   NOT NULL,
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_date     (date),
      INDEX idx_status   (status),
      INDEX idx_type     (type)
    )
  `);
  console.log("✅ Table: appointments");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS services (
      id          VARCHAR(36)   NOT NULL PRIMARY KEY,
      name        VARCHAR(255)  NOT NULL,
      category    VARCHAR(100)  NOT NULL DEFAULT 'Other',
      description TEXT          NULL,
      duration    INT           NOT NULL DEFAULT 60,
      price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      deposit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_active   TINYINT(1)    NOT NULL DEFAULT 1,
      staff_ids   JSON          NULL,
      image_url   VARCHAR(500)  NULL,
      admin_id    VARCHAR(36)   NOT NULL,
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id  (admin_id),
      INDEX idx_category  (category),
      INDEX idx_is_active (is_active)
    )
  `);
  console.log("✅ Table: services");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id            VARCHAR(36)   NOT NULL PRIMARY KEY,
      name          VARCHAR(255)  NOT NULL,
      category      VARCHAR(100)  NOT NULL DEFAULT 'Other',
      contact_name  VARCHAR(255)  NULL,
      email         VARCHAR(255)  NULL,
      phone         VARCHAR(50)   NULL,
      address       VARCHAR(255)  NULL,
      city          VARCHAR(100)  NULL,
      country       VARCHAR(100)  NULL,
      tax_number    VARCHAR(100)  NULL,
      payment_terms VARCHAR(50)   NULL,
      credit_limit  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      balance_due   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status        ENUM('active','inactive','blacklisted') NOT NULL DEFAULT 'active',
      notes         TEXT          NULL,
      admin_id      VARCHAR(36)   NOT NULL,
      created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_status   (status),
      INDEX idx_category (category)
    )
  `);
  console.log("✅ Table: suppliers");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS price_tiers (
      id               VARCHAR(36)   NOT NULL PRIMARY KEY,
      name             VARCHAR(255)  NOT NULL,
      description      TEXT          NULL,
      discount_type    ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
      discount_value   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      min_order_qty    INT           NOT NULL DEFAULT 0,
      min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      customer_group   VARCHAR(100)  NOT NULL DEFAULT 'All Customers',
      is_active        TINYINT(1)    NOT NULL DEFAULT 1,
      priority         INT           NOT NULL DEFAULT 1,
      applies_to       ENUM('all','category','product') NOT NULL DEFAULT 'all',
      category_ids     JSON          NULL,
      product_ids      JSON          NULL,
      valid_from       DATE          NULL,
      valid_until      DATE          NULL,
      admin_id         VARCHAR(36)   NOT NULL,
      created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id       (admin_id),
      INDEX idx_is_active      (is_active),
      INDEX idx_customer_group (customer_group),
      INDEX idx_priority       (priority),
      INDEX idx_valid_until    (valid_until)
    )
  `);
  console.log("✅ Table: price_tiers");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id               VARCHAR(36)   NOT NULL PRIMARY KEY,
      rx_number        VARCHAR(50)   NOT NULL UNIQUE,
      patient_name     VARCHAR(255)  NOT NULL,
      patient_phone    VARCHAR(50)   NULL,
      patient_dob      DATE          NULL,
      patient_id_no    VARCHAR(100)  NULL,
      doctor_name      VARCHAR(255)  NOT NULL,
      doctor_reg_no    VARCHAR(100)  NULL,
      hospital         VARCHAR(255)  NULL,
      items            JSON          NOT NULL,
      status           ENUM('pending','verified','dispensed','partial','cancelled','expired') NOT NULL DEFAULT 'pending',
      payment_status   ENUM('unpaid','partial','paid')                                       NOT NULL DEFAULT 'unpaid',
      total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      amount_paid      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      insurance_name   VARCHAR(255)  NULL,
      insurance_no     VARCHAR(100)  NULL,
      insurance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      issued_date      DATE          NOT NULL,
      expiry_date      DATE          NULL,
      dispensed_date   DATE          NULL,
      notes            TEXT          NULL,
      admin_id         VARCHAR(36)   NOT NULL,
      created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id       (admin_id),
      INDEX idx_status         (status),
      INDEX idx_payment_status (payment_status),
      INDEX idx_issued_date    (issued_date),
      INDEX idx_expiry_date    (expiry_date),
      INDEX idx_patient_name   (patient_name)
    )
  `);
  console.log("✅ Table: prescriptions");

  await conn.query(`
  CREATE TABLE IF NOT EXISTS password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    CHAR(36) NOT NULL UNIQUE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
  );  
  `);
  console.log("✅ Table: password_resets");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  checkout_request_id VARCHAR(100) NOT NULL UNIQUE,
  merchant_request_id VARCHAR(100) NULL,
  amount              DECIMAL(10,2) NOT NULL,
  phone               VARCHAR(20) NOT NULL,
  plan                VARCHAR(20) NOT NULL,
  status              ENUM('pending','completed','failed','cancelled') DEFAULT 'pending',
  mpesa_receipt       VARCHAR(50) NULL,
  result_desc         TEXT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id             (user_id),
  INDEX idx_checkout_request_id (checkout_request_id)
  );
  `);
  console.log("✅ Table: mpesa_transactions");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            CHAR(36) NOT NULL UNIQUE,
  plan               ENUM('starter','pro','enterprise','lifetime') NOT NULL DEFAULT 'starter',
  status             ENUM('active','expired','cancelled','pending') NOT NULL DEFAULT 'pending',
  amount             DECIMAL(10,2) NOT NULL,
  next_billing_date  DATE NOT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
  );
  `);
  console.log("✅ Table: subscriptions");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notifications (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  admin_id   CHAR(36)     NOT NULL,
  type       ENUM('order','login','stock','refund') NOT NULL DEFAULT 'login',
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at)
);
`);
  console.log("✅ Table: notifications");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS support_messages (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  admin_id   CHAR(36)     NOT NULL,
  sender     ENUM('admin','super_admin','staff') NOT NULL DEFAULT 'admin',
  title      VARCHAR(255) NOT NULL DEFAULT 'Support',
  message    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_support_admin_id (admin_id),
  INDEX idx_support_created_at (created_at)
);
`);
  try {
    await conn.query(`ALTER TABLE support_messages MODIFY sender ENUM('admin','super_admin','staff') NOT NULL DEFAULT 'admin'`);
  } catch (e) {
    // ignore if the column is already correct or cannot be altered
  }
  console.log("✅ Table: support_messages");

  await conn.query(`
  CREATE TABLE IF NOT EXISTS site_analytics (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  domain          VARCHAR(100)    NOT NULL,      -- matches users.domain
  total_visits    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_clicks    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  unique_visitors BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_visit      DATETIME        NULL,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_domain (domain)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Table: site_analytics');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id               VARCHAR(36)   NOT NULL PRIMARY KEY,
      name             VARCHAR(255)  NOT NULL,
      description      TEXT          NULL,
      discount_type    ENUM('percentage','fixed','buy_x_get_y') NOT NULL DEFAULT 'percentage',
      discount_value   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      max_discount     DECIMAL(10,2) NULL,
      min_order_qty    INT           NOT NULL DEFAULT 1,
      min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      applies_to       ENUM('all','category','product') NOT NULL DEFAULT 'all',
      category_ids     JSON          NULL,
      product_ids      JSON          NULL,
      code             VARCHAR(50)   UNIQUE NULL,
      usage_limit      INT           NULL,
      usage_count      INT           NOT NULL DEFAULT 0,
      valid_from       DATETIME      NULL,
      valid_until      DATETIME      NULL,
      is_active        TINYINT(1)    NOT NULL DEFAULT 1,
      admin_id         VARCHAR(36)   NOT NULL,
      created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_code (code),  
      INDEX idx_is_active (is_active),
      INDEX idx_valid_until (valid_until)
    )
  `);
  console.log("✅ Table: discounts");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_update_state (
      id             INT           NOT NULL PRIMARY KEY DEFAULT 1,
      is_critical    TINYINT(1)    NOT NULL DEFAULT 0,
      message        TEXT          NULL,
      target_version VARCHAR(64)   NULL,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await conn.query(`
    INSERT IGNORE INTO app_update_state (id, is_critical, message, target_version)
    VALUES (1, 0, NULL, NULL)
  `);
  console.log("✅ Table: app_update_state");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_update_dismissals (
      id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id      CHAR(36)     NOT NULL,
      version      VARCHAR(64)  NOT NULL,
      dismissed_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_version (user_id, version),
      INDEX idx_user_id (user_id)
    )
  `);
  console.log("✅ Table: app_update_dismissals");

  
  // ── SAFE MIGRATIONS (adds columns to existing tables without breaking them) ──

  const migrations: { table: string; column: string; sql: string }[] = [
    {
      table:  "users",
      column: "is_super_admin",
      sql:    "ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE AFTER role",
    },
    {
      table:  "users",
      column: "pos_type",
      sql:    "ALTER TABLE users ADD COLUMN pos_type ENUM('retail','restaurant','salon','wholesale','pharmacy') NULL DEFAULT NULL AFTER domain",
    },
    {
      table:  "users",
      column: "subdomain_url",
      sql:    "ALTER TABLE users ADD COLUMN subdomain_url VARCHAR(255) NULL DEFAULT NULL AFTER pos_type",
    },
    {
      table:  "users",
      column: "subdomain_status",
      sql:    "ALTER TABLE users ADD COLUMN subdomain_status ENUM('active','pending','failed') NULL DEFAULT NULL AFTER subdomain_url",
    },
    {
      table:  "staff",
      column: "updated_at",
      sql:    "ALTER TABLE staff ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    },
    {
      table:  "products",
      column: "emoji",
      sql:    "ALTER TABLE products ADD COLUMN emoji VARCHAR(10) NULL DEFAULT NULL",
    },
    {
      table:  "products",
      column: "barcode",
      sql:    "ALTER TABLE products ADD COLUMN barcode VARCHAR(100) NULL DEFAULT NULL UNIQUE",
    },
    {
      table:  "products",
      column: "cost",
      sql:    "ALTER TABLE products ADD COLUMN cost DECIMAL(10,2) NULL DEFAULT NULL",
    },
    {
      table:  "products",
      column: "image",
      sql:    "ALTER TABLE products ADD COLUMN image LONGTEXT NULL DEFAULT NULL",
    },
    {
      table:  "orders",
      column: "discount_amount",
      sql:    "ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER subtotal",
    },
    {
      table:  "orders",
      column: "discount_code",
      sql:    "ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50) NULL AFTER discount_amount",
    },
    {
      table:  "users",
      column: "account_status",
      sql:    "ALTER TABLE users ADD COLUMN account_status ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER subdomain_status",
    },
  ];

  for (const m of migrations) {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, m.table, m.column]
    );
    if ((cols as unknown[]).length === 0) {
      await conn.query(m.sql);
      console.log(`🔧 Migration: added ${m.table}.${m.column}`);
    }
  }

  // ── SEED DEFAULT ADMIN ───────────────────────────────

  const [rows] = await conn.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if ((rows as { id: string }[]).length === 0) {
    const hashed = await bcrypt.hash("admin123", 10);
    await conn.query(
      `INSERT INTO users (full_name, email, password, role, is_super_admin, store_name, domain)
       VALUES (?, ?, ?, 'admin', TRUE, ?, ?)`,
      ["Super Admin", "admin@postore.app", hashed, "POStore", "postore"]
    );
    console.log("🌱 Default admin seeded as super admin");
  } else {
    // Ensure the default admin@postore.app is always marked as superadmin
    await conn.query(
      "UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@postore.app' AND role = 'admin'"
    );
    console.log("✅ Ensured admin@postore.app is marked as super admin");
  }

  await conn.end();
  console.log("🎉 Database initialization complete!\n");
}