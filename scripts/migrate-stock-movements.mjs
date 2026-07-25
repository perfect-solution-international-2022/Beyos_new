import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "beyos", connectTimeout: 10000,
});

try {
  await db.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NULL,
    variant_id INT NULL,
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(60) NOT NULL DEFAULT '',
    movement_type VARCHAR(40) NOT NULL DEFAULT 'system',
    quantity_before INT NOT NULL,
    quantity_change INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_type VARCHAR(40) NULL,
    reference_id VARCHAR(80) NULL,
    note VARCHAR(255) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_movement_created (created_at),
    INDEX idx_stock_movement_product (product_id, variant_id),
    INDEX idx_stock_movement_reference (reference_type, reference_id),
    CONSTRAINT fk_stock_movement_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_stock_movement_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_stock_movement_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);
  await db.query("ALTER TABLE stock_movements DROP FOREIGN KEY fk_stock_movement_product");
  await db.query("ALTER TABLE stock_movements MODIFY product_id INT NULL");
  await db.query("ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movement_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL");

  await db.query("DROP TRIGGER IF EXISTS trg_products_stock_movement");
  await db.query(`CREATE TRIGGER trg_products_stock_movement AFTER UPDATE ON products FOR EACH ROW
    BEGIN
      IF NEW.stock <> OLD.stock THEN
        INSERT INTO stock_movements
          (product_id, product_name, sku, movement_type, quantity_before, quantity_change, quantity_after,
           reference_type, reference_id, note, created_by)
        VALUES
          (NEW.id, NEW.name, COALESCE(NEW.sku, ''), COALESCE(@stock_movement_type, 'system'), OLD.stock,
           NEW.stock - OLD.stock, NEW.stock, @stock_reference_type, @stock_reference_id, @stock_note, @stock_created_by);
      END IF;
    END`);

  await db.query("DROP TRIGGER IF EXISTS trg_product_variants_stock_movement");
  await db.query(`CREATE TRIGGER trg_product_variants_stock_movement AFTER UPDATE ON product_variants FOR EACH ROW
    BEGIN
      IF NEW.stock <> OLD.stock THEN
        INSERT INTO stock_movements
          (product_id, variant_id, product_name, sku, movement_type, quantity_before, quantity_change, quantity_after,
           reference_type, reference_id, note, created_by)
        SELECT p.id, NEW.id, p.name, COALESCE(NEW.sku, p.sku, ''), COALESCE(@stock_movement_type, 'system'),
          OLD.stock, NEW.stock - OLD.stock, NEW.stock, @stock_reference_type, @stock_reference_id, @stock_note, @stock_created_by
        FROM products p WHERE p.id = NEW.product_id;
      END IF;
    END`);
  console.log("Stock movement ledger is ready.");
} finally {
  await db.end();
}
