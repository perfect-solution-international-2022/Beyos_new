import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "beyos",
});

try {
  const [columns] = await db.query("SHOW COLUMNS FROM products LIKE 'image_alt'");
  if (!columns.length) {
    await db.query("ALTER TABLE products ADD COLUMN image_alt VARCHAR(255) NULL AFTER image");
  }
  console.log("Product SEO migration complete.");
} finally {
  await db.end();
}
