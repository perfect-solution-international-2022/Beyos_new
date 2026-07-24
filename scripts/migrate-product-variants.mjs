import mysql from "mysql2/promise";

const cfg = {
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "beyos",
};
const db = await mysql.createConnection(cfg);

const columns = [
  ["sale_price", "DECIMAL(10,2) NULL"],
  ["wholesale_min_qty", "INT NOT NULL DEFAULT 0"],
  ["production_cost", "DECIMAL(10,2) NULL"],
  ["stock_status", "VARCHAR(30) NOT NULL DEFAULT 'in_stock'"],
  ["weight_kg", "DECIMAL(10,3) NULL"],
  ["length_cm", "DECIMAL(10,2) NULL"],
  ["width_cm", "DECIMAL(10,2) NULL"],
  ["height_cm", "DECIMAL(10,2) NULL"],
];

try {
  for (const [name, definition] of columns) {
    const [rows] = await db.query(
      "SELECT COUNT(*) count FROM information_schema.columns WHERE table_schema=? AND table_name='product_variants' AND column_name=?",
      [cfg.database, name]
    );
    if (!rows[0].count) await db.query(`ALTER TABLE product_variants ADD COLUMN ${name} ${definition}`);
  }
  console.log("Product variation migration complete");
} finally {
  await db.end();
}
