import mysql from "mysql2/promise";

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos",
};

async function ensureColumn(db, name, definition) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'categories' AND column_name = ?`,
    [config.database, name]
  );
  if (Number(rows[0].count) === 0) {
    await db.query(`ALTER TABLE categories ADD COLUMN ${name} ${definition}`);
    console.log(`Added categories.${name}`);
    return true;
  }
  return false;
}

const categories = [
  ["Men", "men", "/images/men-category.svg", "/shop?category=men", 1, 1, 10],
  ["Men T-Shirt", "men-t-shirt", "/images/products/tshirt-aqua.webp", "/product/classic-crew-tee", 1, 0, 20],
  ["Women", "women", "/images/women-category.svg", "/shop?category=women", 1, 1, 30],
  ["Women T-Shirt", "women-t-shirt", "/images/products/tshirt-coral.webp", "/product/everyday-knit-top", 1, 0, 40],
  ["Accessories", "accessories", null, "/shop?category=accessories", 0, 0, 50],
];

const db = await mysql.createConnection(config);
try {
  await ensureColumn(db, "image_data", "LONGBLOB NULL AFTER image_url");
  await ensureColumn(db, "image_mime", "VARCHAR(100) NULL AFTER image_data");
  await ensureColumn(db, "homepage_visible", "TINYINT(1) NOT NULL DEFAULT 0 AFTER image_mime");
  const addedShopVisibility = await ensureColumn(
    db,
    "shop_visible",
    "TINYINT(1) NOT NULL DEFAULT 0 AFTER homepage_visible"
  );
  await ensureColumn(db, "homepage_order", "INT NOT NULL DEFAULT 0 AFTER shop_visible");
  await ensureColumn(db, "homepage_href", "VARCHAR(500) NULL AFTER homepage_order");
  await ensureColumn(
    db,
    "updated_at",
    "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"
  );

  for (const [name, slug, imageUrl, homepageHref, homepageVisible, shopVisible, homepageOrder] of categories) {
    await db.execute(
      `INSERT INTO categories
         (name, slug, image_url, homepage_href, homepage_visible, shop_visible, homepage_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [name, slug, imageUrl, homepageHref, homepageVisible, shopVisible, homepageOrder]
    );
    if (homepageVisible) {
      await db.execute(
        `UPDATE categories
         SET image_url = ?, homepage_href = ?, homepage_visible = 1, homepage_order = ?
         WHERE slug = ? AND image_url IS NULL AND homepage_href IS NULL AND homepage_order = 0`,
        [imageUrl, homepageHref, homepageOrder, slug]
      );
    }
  }

  if (addedShopVisibility) {
    await db.query("UPDATE categories SET shop_visible = CASE WHEN slug IN ('men','women') THEN 1 ELSE 0 END");
  }

  const [rows] = await db.query(
    "SELECT name, slug, homepage_visible, shop_visible, homepage_order FROM categories ORDER BY homepage_order, name"
  );
  console.table(rows);
  console.log("Homepage category migration complete.");
} finally {
  await db.end();
}
