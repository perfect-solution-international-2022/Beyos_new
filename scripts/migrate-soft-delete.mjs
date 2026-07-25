import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos", connectTimeout: 10000,
});
try {
  for (const table of ["users", "products", "orders", "reseller_orders", "pos_sales"]) {
    const [rows] = await db.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'deleted_at' LIMIT 1",
      [table]
    );
    if (!rows.length) await db.query(`ALTER TABLE \`${table}\` ADD COLUMN deleted_at TIMESTAMP NULL, ADD INDEX idx_${table}_deleted_at (deleted_at)`);
  }
  console.log("Soft-delete columns are ready.");
} finally { await db.end(); }
