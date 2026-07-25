import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  connectTimeout: 10000,
});

async function add(table, column, definition) {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  if (!rows.length) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

for (const [column, definition] of [["district", "VARCHAR(120) NULL AFTER address"], ["district_id", "INT NULL AFTER district"], ["city_id", "INT NULL AFTER city"]]) await add("orders", column, definition);
for (const [column, definition] of [["delivery_district", "VARCHAR(120) NULL AFTER delivery_address"], ["delivery_district_id", "INT NULL AFTER delivery_district"], ["delivery_city_id", "INT NULL AFTER delivery_city"]]) await add("pos_sales", column, definition);
await connection.end();
console.log("Courier location columns are ready.");
