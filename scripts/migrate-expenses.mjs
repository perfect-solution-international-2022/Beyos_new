import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "beyos",
});
try {
  await db.query(`CREATE TABLE IF NOT EXISTS expenses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    category     VARCHAR(50) NOT NULL,
    description  VARCHAR(255) NOT NULL DEFAULT '',
    amount       DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    created_by   INT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_category (category)
  ) ENGINE=InnoDB`);
  console.log("Expenses migration complete");
} finally { await db.end(); }
