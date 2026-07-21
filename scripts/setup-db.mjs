// Beyos DB setup & seed.
// Usage: npm run db:setup   (loads .env.local via --env-file)
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const cfg = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos",
};

async function ensureColumns(db, table, columns) {
  for (const [name, definition] of columns) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [cfg.database, table, name]
    );
    if (rows[0].c === 0) {
      console.log(`   + adding ${table}.${name}`);
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  }
}

async function main() {
  const schema = await readFile(join(root, "db", "schema.sql"), "utf8");
  const products = JSON.parse(
    await readFile(join(root, "db", "products.seed.json"), "utf8")
  );

  // 1) Connect without a database to run the schema (which creates it).
  const bootstrap = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });
  console.log("→ Connected to MySQL. Creating database & tables…");
  await bootstrap.query(schema);
  await bootstrap.end();

  // 2) Reconnect to the beyos database.
  const db = await mysql.createConnection(cfg);

  // 2a) Idempotent migration — add any missing user columns on existing DBs.
  await ensureColumns(db, "users", [
    ["first_name", "VARCHAR(120) NOT NULL DEFAULT '' AFTER name"],
    ["last_name", "VARCHAR(120) NOT NULL DEFAULT '' AFTER first_name"],
    ["role", "ENUM('buyer','reseller') NOT NULL DEFAULT 'buyer' AFTER password_hash"],
    ["reseller_status", "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER role"],
    ["session_version", "INT NOT NULL DEFAULT 0 AFTER reseller_status"],
    ["phone", "VARCHAR(40) NOT NULL DEFAULT '' AFTER role"],
    ["address_line1", "VARCHAR(255) NULL AFTER phone"],
    ["address_line2", "VARCHAR(255) NULL AFTER address_line1"],
    ["city", "VARCHAR(120) NULL AFTER address_line2"],
    ["district", "VARCHAR(120) NULL AFTER city"],
    ["province", "VARCHAR(120) NULL AFTER district"],
    ["postal_code", "VARCHAR(30) NULL AFTER province"],
    ["bank_name", "VARCHAR(120) NULL"],
    ["account_name", "VARCHAR(160) NULL"],
    ["account_number", "VARCHAR(60) NULL"],
    ["bank_branch", "VARCHAR(120) NULL"],
    ["allow_price_override", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["min_markup_pct", "DECIMAL(6,2) NOT NULL DEFAULT 0"],
    ["max_markup_pct", "DECIMAL(6,2) NULL"],
    ["credit_limit", "DECIMAL(12,2) NOT NULL DEFAULT 0"],
  ]);
  await db.query("ALTER TABLE users MODIFY COLUMN reseller_status ENUM('pending','approved','suspended','rejected') NOT NULL DEFAULT 'approved'");

  // Reseller-specific product pricing columns.
  await ensureColumns(db, "products", [
    ["sku", "VARCHAR(60) NOT NULL DEFAULT '' AFTER slug"],
    ["reseller_price", "DECIMAL(10,2) NULL AFTER price"],
    ["wholesale_price", "DECIMAL(10,2) NULL AFTER reseller_price"],
    ["wholesale_min_qty", "INT NOT NULL DEFAULT 50 AFTER wholesale_price"],
    // Extended admin product fields.
    ["short_description", "VARCHAR(500) NULL"],
    ["production_cost", "DECIMAL(10,2) NULL"],
    ["visibility", "VARCHAR(20) NOT NULL DEFAULT 'public'"],
    ["is_reseller_product", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["low_stock_threshold", "INT NOT NULL DEFAULT 10"],
    ["allow_backorder", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["weight_kg", "DECIMAL(8,2) NULL"],
    ["length_cm", "DECIMAL(8,2) NULL"],
    ["width_cm", "DECIMAL(8,2) NULL"],
    ["height_cm", "DECIMAL(8,2) NULL"],
    ["meta_title", "VARCHAR(255) NULL"],
    ["meta_description", "VARCHAR(500) NULL"],
    ["meta_keywords", "VARCHAR(255) NULL"],
    // Old-Beyos parity: product type, sale window, inventory status, publishing.
    ["product_type", "VARCHAR(20) NOT NULL DEFAULT 'simple'"],
    ["sale_start", "DATE NULL"],
    ["sale_end", "DATE NULL"],
    ["stock_status", "VARCHAR(20) NOT NULL DEFAULT 'in_stock'"],
    ["sold_individually", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["is_publish", "TINYINT(1) NOT NULL DEFAULT 1"],
    ["payment_methods", "VARCHAR(255) NULL"],
    ["tags", "VARCHAR(500) NULL"],
  ]);

  await db.query(`CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NULL,
    image_data LONGBLOB NOT NULL,
    image_mime VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_image_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_image_product (product_id)
  ) ENGINE=InnoDB`);

  // Product variants (for Variable products) and linked products.
  await db.query(`CREATE TABLE IF NOT EXISTS product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    sku VARCHAR(60) NOT NULL DEFAULT '',
    attribute_summary VARCHAR(255) NOT NULL DEFAULT '',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    reseller_price DECIMAL(10,2) NULL,
    wholesale_price DECIMAL(10,2) NULL,
    stock INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    image VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variant_product (product_id)
  ) ENGINE=InnoDB`);

  await db.query(`CREATE TABLE IF NOT EXISTS product_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    linked_product_id INT NOT NULL,
    link_type VARCHAR(20) NOT NULL DEFAULT 'related',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_link_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_link_linked FOREIGN KEY (linked_product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_link_product (product_id)
  ) ENGINE=InnoDB`);

  await ensureColumns(db, "reseller_orders", [
    ["customer_email", "VARCHAR(190) NULL"],
    ["address_line1", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["address_line2", "VARCHAR(255) NULL"],
    ["province", "VARCHAR(120) NOT NULL DEFAULT ''"],
    ["district", "VARCHAR(120) NOT NULL DEFAULT ''"],
    ["district_id", "INT NULL"],
    ["city", "VARCHAR(120) NOT NULL DEFAULT ''"],
    ["city_id", "INT NULL"],
    ["postal_code", "VARCHAR(30) NULL"],
    ["notes", "VARCHAR(500) NULL"],
    ["subtotal", "DECIMAL(10,2) NOT NULL DEFAULT 0"],
    ["delivery_fee", "DECIMAL(10,2) NOT NULL DEFAULT 300"],
    ["koombiyo_waybill_id", "VARCHAR(100) NULL"],
    ["koombiyo_status", "VARCHAR(100) NULL"],
    ["koombiyo_response", "JSON NULL"],
    ["koombiyo_updated_at", "TIMESTAMP NULL"],
    ["inventory_reverted_at", "TIMESTAMP NULL"],
    ["wallet_credited_at", "TIMESTAMP NULL"],
  ]);
  await ensureColumns(db, "reseller_order_items", [
    ["product_id", "INT NULL AFTER product_slug"],
    ["variant_id", "INT NULL AFTER product_id"],
    ["variant_summary", "VARCHAR(255) NULL AFTER variant_id"],
  ]);
  await db.query(`CREATE TABLE IF NOT EXISTS reseller_wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reseller_id INT NOT NULL,
    type ENUM('credit','debit','reversal') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_type VARCHAR(30) NOT NULL,
    reference_id VARCHAR(40) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_wallet_reference (reference_type, reference_id, type),
    INDEX idx_wallet_reseller (reseller_id)
  ) ENGINE=InnoDB`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'credit', profit, 'order', order_ref, 'Reseller order profit'
    FROM reseller_orders WHERE status IN ('completed','delivered')`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'debit', amount, 'withdrawal', withdraw_ref, 'Withdrawal requested' FROM withdrawals`);
  await db.query(`INSERT IGNORE INTO reseller_wallet_transactions
    (reseller_id, type, amount, reference_type, reference_id, description)
    SELECT reseller_id, 'reversal', amount, 'withdrawal', withdraw_ref, 'Rejected withdrawal returned'
    FROM withdrawals WHERE status = 'rejected'`);

  console.log(`→ Seeding ${products.length} products…`);

  const sql = `
    INSERT INTO products
      (slug, sku, name, category, price, reseller_price, wholesale_price,
       wholesale_min_qty, compare_at_price, image, images,
       description, sizes, colors, rating, reviews, badge, featured, stock)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      sku=VALUES(sku), name=VALUES(name), category=VALUES(category),
      price=VALUES(price), reseller_price=VALUES(reseller_price),
      wholesale_price=VALUES(wholesale_price), wholesale_min_qty=VALUES(wholesale_min_qty),
      compare_at_price=VALUES(compare_at_price), image=VALUES(image),
      images=VALUES(images), description=VALUES(description), sizes=VALUES(sizes),
      colors=VALUES(colors), rating=VALUES(rating), reviews=VALUES(reviews),
      badge=VALUES(badge), featured=VALUES(featured), stock=VALUES(stock)`;

  for (const p of products) {
    const sku = "BEY-" + String(p.id).padStart(4, "0");
    const resellerPrice = Math.round(p.price * 0.8);
    const wholesalePrice = Math.round(p.price * 0.72);
    await db.execute(sql, [
      p.slug,
      sku,
      p.name,
      p.category,
      p.price,
      resellerPrice,
      wholesalePrice,
      50,
      p.compareAtPrice ?? null,
      p.image,
      JSON.stringify(p.images),
      p.description,
      JSON.stringify(p.sizes),
      JSON.stringify(p.colors),
      p.rating,
      p.reviews,
      p.badge ?? null,
      p.featured ? 1 : 0,
      p.stock,
    ]);
  }

  // Payment tracking columns for buyer orders (OnePay integration).
  await ensureColumns(db, "orders", [
    ["payment_method", "VARCHAR(20) NOT NULL DEFAULT 'cod'"],
    ["payment_status", "VARCHAR(20) NOT NULL DEFAULT 'unpaid'"],
    ["payment_ref", "VARCHAR(80) NULL"],
    ["paid_at", "TIMESTAMP NULL"],
    ["promo_code", "VARCHAR(40) NULL"],
    ["discount", "DECIMAL(10,2) NOT NULL DEFAULT 0"],
    ["koombiyo_waybill_id", "VARCHAR(100) NULL"],
    ["koombiyo_status", "VARCHAR(100) NULL"],
    ["koombiyo_response", "JSON NULL"],
    ["koombiyo_updated_at", "TIMESTAMP NULL"],
  ]);

  // Delivery fulfillment columns for POS sales.
  await ensureColumns(db, "pos_sales", [
    ["fulfillment_type", "VARCHAR(20) NOT NULL DEFAULT 'pickup'"],
    ["delivery_address", "VARCHAR(255) NULL"],
    ["delivery_city", "VARCHAR(120) NULL"],
    ["delivery_status", "VARCHAR(20) NULL"],
  ]);

  // Make product category free-form so admin-created categories work.
  await db.query("ALTER TABLE products MODIFY COLUMN category VARCHAR(120) NOT NULL DEFAULT 'men'");

  // Store homepage category settings and uploaded category images in MySQL.
  // Keeping image bytes in the database makes uploads survive app deployments.
  await ensureColumns(db, "categories", [
    ["image_data", "LONGBLOB NULL AFTER image_url"],
    ["image_mime", "VARCHAR(100) NULL AFTER image_data"],
    ["homepage_visible", "TINYINT(1) NOT NULL DEFAULT 0 AFTER image_mime"],
    ["shop_visible", "TINYINT(1) NOT NULL DEFAULT 0 AFTER homepage_visible"],
    ["homepage_order", "INT NOT NULL DEFAULT 0 AFTER shop_visible"],
    ["homepage_href", "VARCHAR(500) NULL AFTER homepage_order"],
    ["updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"],
  ]);

  // Seed the categories currently shown on the storefront homepage. Existing
  // admin changes are preserved on later setup runs.
  const baseCats = [
    ["Men", "men", "/images/men-category.svg", "/shop?category=men", 1, 1, 10],
    ["Men T-Shirt", "men-t-shirt", "/images/products/tshirt-aqua.webp", "/product/classic-crew-tee", 1, 0, 20],
    ["Women", "women", "/images/women-category.svg", "/shop?category=women", 1, 1, 30],
    ["Women T-Shirt", "women-t-shirt", "/images/products/tshirt-coral.webp", "/product/everyday-knit-top", 1, 0, 40],
    ["Accessories", "accessories", null, "/shop?category=accessories", 0, 0, 50],
  ];
  for (const [name, slug, imageUrl, homepageHref, homepageVisible, shopVisible, homepageOrder] of baseCats) {
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

  // Seed base attributes and their values.
  const attrs = [
    ["Size", "size", ["XS", "S", "M", "L", "XL", "XXL", "One Size"]],
    ["Color", "color", ["Black", "White", "Navy", "Grey", "Olive", "Coral", "Ivory", "Brown"]],
  ];
  for (const [name, slug, values] of attrs) {
    await db.execute(
      "INSERT INTO attributes (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
      [name, slug]
    );
    const [[{ id }]] = await db.query("SELECT id FROM attributes WHERE slug = ?", [slug]);
    for (const v of values) {
      const [exists] = await db.query(
        "SELECT id FROM attribute_values WHERE attribute_id = ? AND value = ?",
        [id, v]
      );
      if (exists.length === 0) {
        await db.execute("INSERT INTO attribute_values (attribute_id, value) VALUES (?, ?)", [id, v]);
      }
    }
  }

  // Widen the role enum to include admin, then seed a default admin account.
  await db.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('buyer','reseller','admin') NOT NULL DEFAULT 'buyer'"
  );
  const adminEmail = "admin@beyosclothing.com";
  const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [adminEmail]);
  if (existing.length === 0) {
    const hash = await bcrypt.hash("admin1234", 10);
    await db.execute(
      `INSERT INTO users (name, first_name, last_name, email, password_hash, role, phone)
       VALUES ('Beyos Admin','Beyos','Admin',?,?,'admin','')`,
      [adminEmail, hash]
    );
    console.log(`→ Seeded admin account: ${adminEmail} / admin1234`);
  }

  const [[{ c }]] = await db.query("SELECT COUNT(*) AS c FROM products");
  const [[{ u }]] = await db.query("SELECT COUNT(*) AS u FROM users");
  console.log(`✓ Done. products=${c}, users=${u}`);
  await db.end();
}

main().catch((err) => {
  console.error("✗ DB setup failed:", err.message);
  process.exit(1);
});
