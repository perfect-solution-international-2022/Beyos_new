import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos",
};

const defaults = [
  ["hero1.webp", "Beyos Clothing collection", 10],
  ["hero2.webp", "Beyos Clothing fashion", 20],
  ["hero3.webp", "Beyos Clothing style", 30],
];

const db = await mysql.createConnection(config);
try {
  const [rows] = await db.query("SELECT COUNT(*) AS count FROM hero_slides");
  if (Number(rows[0].count) > 0) {
    console.log("Hero slides already exist; no default slides were imported.");
  } else {
    for (const [filename, alt, order] of defaults) {
      const bytes = await readFile(join(root, "public", "images", "hero-images", filename));
      await db.execute(
        `INSERT INTO hero_slides (image_data, image_mime, alt_text, sort_order, is_active)
         VALUES (?, 'image/webp', ?, ?, 1)`,
        [bytes, alt, order]
      );
    }
    console.log(`Imported ${defaults.length} current homepage hero slides.`);
  }
} finally {
  await db.end();
}
