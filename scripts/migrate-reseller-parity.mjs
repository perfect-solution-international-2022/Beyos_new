import mysql from "mysql2/promise";

const cfg = {
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "beyos",
};
const db = await mysql.createConnection(cfg);

async function ensure(table, columns) {
  for (const [name, definition] of columns) {
    const [rows] = await db.query(`SELECT COUNT(*) c FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?`, [cfg.database, table, name]);
    if (!rows[0].c) await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

try {
  await ensure("users", [
    ["allow_price_override", "TINYINT(1) NOT NULL DEFAULT 1"], ["min_markup_pct", "DECIMAL(6,2) NOT NULL DEFAULT 0"],
    ["max_markup_pct", "DECIMAL(6,2) NULL"], ["credit_limit", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
  ]);
  await db.query("ALTER TABLE users MODIFY COLUMN reseller_status ENUM('pending','approved','suspended','rejected') NOT NULL DEFAULT 'approved'");
  await ensure("reseller_orders", [
    ["customer_email", "VARCHAR(190) NULL"], ["address_line1", "VARCHAR(255) NOT NULL DEFAULT ''"], ["address_line2", "VARCHAR(255) NULL"],
    ["province", "VARCHAR(120) NOT NULL DEFAULT ''"], ["district", "VARCHAR(120) NOT NULL DEFAULT ''"], ["district_id", "INT NULL"],
    ["city", "VARCHAR(120) NOT NULL DEFAULT ''"], ["city_id", "INT NULL"], ["postal_code", "VARCHAR(30) NULL"], ["notes", "VARCHAR(500) NULL"],
    ["subtotal", "DECIMAL(10,2) NOT NULL DEFAULT 0"], ["delivery_fee", "DECIMAL(10,2) NOT NULL DEFAULT 300"],
    ["koombiyo_waybill_id", "VARCHAR(100) NULL"], ["koombiyo_status", "VARCHAR(100) NULL"], ["koombiyo_response", "JSON NULL"],
    ["koombiyo_updated_at", "TIMESTAMP NULL"], ["inventory_reverted_at", "TIMESTAMP NULL"], ["wallet_credited_at", "TIMESTAMP NULL"],
  ]);
  await ensure("reseller_order_items", [
    ["product_id", "INT NULL AFTER product_slug"], ["variant_id", "INT NULL AFTER product_id"], ["variant_summary", "VARCHAR(255) NULL AFTER variant_id"],
  ]);
  await db.query(`CREATE TABLE IF NOT EXISTS reseller_wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY, reseller_id INT NOT NULL, type ENUM('credit','debit','reversal') NOT NULL,
    amount DECIMAL(10,2) NOT NULL, reference_type VARCHAR(30) NOT NULL, reference_id VARCHAR(40) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_wallet_reference (reference_type, reference_id, type), INDEX idx_wallet_reseller (reseller_id)
  ) ENGINE=InnoDB`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'credit', profit, 'order', order_ref, 'Reseller order profit'
    FROM reseller_orders WHERE status IN ('completed','delivered')`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'debit', amount, 'withdrawal', withdraw_ref, 'Withdrawal requested'
    FROM withdrawals`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'reversal', amount, 'withdrawal', withdraw_ref, 'Rejected withdrawal returned'
    FROM withdrawals WHERE status = 'rejected'`);
  console.log("Reseller parity migration complete");
} finally { await db.end(); }
