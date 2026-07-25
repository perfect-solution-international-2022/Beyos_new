import mysql from "mysql2/promise";

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos",
};

const db = await mysql.createConnection(config);
try {
  const [columns] = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'users' AND column_name IN ('account_status', 'last_login_at')`,
    [config.database]
  );
  const existing = new Set(columns.map((column) => column.column_name));
  if (!existing.has("account_status")) {
    await db.query("ALTER TABLE users ADD COLUMN account_status ENUM('active','suspended','disabled') NOT NULL DEFAULT 'active' AFTER reseller_status");
    await db.query("UPDATE users SET account_status = 'suspended' WHERE role = 'reseller' AND reseller_status = 'suspended'");
    console.log("Added users.account_status");
  }
  if (!existing.has("last_login_at")) {
    await db.query("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL AFTER session_version");
    console.log("Added users.last_login_at");
  }
} finally {
  await db.end();
}
