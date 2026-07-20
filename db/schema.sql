-- Beyos Clothing — MySQL schema
-- Run: mysql -u root -p < db/schema.sql   (or use `npm run db:setup`)

CREATE DATABASE IF NOT EXISTS beyos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE beyos;

-- Users -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(160) NOT NULL,
  first_name    VARCHAR(120) NOT NULL DEFAULT '',
  last_name     VARCHAR(120) NOT NULL DEFAULT '',
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('buyer','reseller','admin') NOT NULL DEFAULT 'buyer',
  phone         VARCHAR(40) NOT NULL DEFAULT '',
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city          VARCHAR(120) NULL,
  district      VARCHAR(120) NULL,
  province      VARCHAR(120) NULL,
  postal_code   VARCHAR(30)  NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Products --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  slug             VARCHAR(160) NOT NULL UNIQUE,
  name             VARCHAR(200) NOT NULL,
  category         ENUM('men','women','accessories') NOT NULL,
  price            DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2) NULL,
  image            VARCHAR(255) NOT NULL,
  images           JSON NOT NULL,
  description      TEXT NOT NULL,
  sizes            JSON NOT NULL,
  colors           JSON NOT NULL,
  rating           DECIMAL(3,2) NOT NULL DEFAULT 0,
  reviews          INT NOT NULL DEFAULT 0,
  badge            VARCHAR(30) NULL,
  featured         TINYINT(1) NOT NULL DEFAULT 0,
  stock            INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_featured (featured)
) ENGINE=InnoDB;

-- Orders ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  order_ref          VARCHAR(40) NOT NULL UNIQUE,
  user_id            INT NULL,
  customer_name      VARCHAR(160) NOT NULL,
  customer_email     VARCHAR(190) NOT NULL,
  customer_phone     VARCHAR(40) NOT NULL,
  address            VARCHAR(255) NOT NULL,
  city               VARCHAR(120) NOT NULL,
  postal_code        VARCHAR(30) NULL,
  subtotal           DECIMAL(10,2) NOT NULL,
  shipping           DECIMAL(10,2) NOT NULL,
  total              DECIMAL(10,2) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_method     VARCHAR(20) NOT NULL DEFAULT 'cod',
  payment_status     VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  payment_ref        VARCHAR(80) NULL,
  paid_at            TIMESTAMP NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Categories (hierarchical) --------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  parent_id  INT NULL,
  image_url  VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id)
    REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Attributes & values ---------------------------------------------------
CREATE TABLE IF NOT EXISTS attributes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attribute_values (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  attribute_id INT NOT NULL,
  value        VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attrval_attr FOREIGN KEY (attribute_id)
    REFERENCES attributes(id) ON DELETE CASCADE,
  INDEX idx_attrval_attr (attribute_id)
) ENGINE=InnoDB;

-- Reseller orders -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reseller_orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_ref      VARCHAR(40) NOT NULL UNIQUE,
  reseller_id    INT NOT NULL,
  customer_name  VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL DEFAULT '',
  customer_address VARCHAR(255) NOT NULL DEFAULT '',
  amount         DECIMAL(10,2) NOT NULL,
  cost           DECIMAL(10,2) NOT NULL,
  profit         DECIMAL(10,2) NOT NULL,
  status         VARCHAR(30) NOT NULL DEFAULT 'pending',
  reject_reason  VARCHAR(255) NULL,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rorder_user FOREIGN KEY (reseller_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rorder_reseller (reseller_id),
  INDEX idx_rorder_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reseller_order_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  product_slug   VARCHAR(160) NOT NULL,
  sku            VARCHAR(60) NOT NULL DEFAULT '',
  name           VARCHAR(200) NOT NULL,
  quantity       INT NOT NULL,
  reseller_price DECIMAL(10,2) NOT NULL,
  selling_price  DECIMAL(10,2) NOT NULL,
  line_total     DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_ritem_order FOREIGN KEY (order_id)
    REFERENCES reseller_orders(id) ON DELETE CASCADE,
  INDEX idx_ritem_order (order_id)
) ENGINE=InnoDB;

-- Reseller withdrawals --------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  withdraw_ref  VARCHAR(40) NOT NULL UNIQUE,
  reseller_id   INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  bank_snapshot VARCHAR(255) NOT NULL DEFAULT '',
  note          VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdraw_user FOREIGN KEY (reseller_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_withdraw_reseller (reseller_id)
) ENGINE=InnoDB;

-- Point of Sale (in-store checkout) --------------------------------------
CREATE TABLE IF NOT EXISTS pos_cashiers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  pin_hash   VARCHAR(255) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pos_shifts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cashier_id      INT NOT NULL,
  opening_float   DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_float   DECIMAL(10,2) NULL,
  expected_cash   DECIMAL(10,2) NULL,
  cash_difference DECIMAL(10,2) NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  opened_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at       TIMESTAMP NULL,
  CONSTRAINT fk_posshift_cashier FOREIGN KEY (cashier_id) REFERENCES pos_cashiers(id) ON DELETE CASCADE,
  INDEX idx_posshift_cashier (cashier_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pos_sales (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number  VARCHAR(40) NOT NULL UNIQUE,
  shift_id        INT NOT NULL,
  cashier_id      INT NOT NULL,
  customer_name   VARCHAR(160) NULL,
  customer_phone  VARCHAR(40) NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'cash',
  amount_tendered DECIMAL(10,2) NULL,
  change_due      DECIMAL(10,2) NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'completed',
  fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup',
  delivery_address VARCHAR(255) NULL,
  delivery_city    VARCHAR(120) NULL,
  delivery_status  VARCHAR(20) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_possale_shift FOREIGN KEY (shift_id) REFERENCES pos_shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_possale_cashier FOREIGN KEY (cashier_id) REFERENCES pos_cashiers(id) ON DELETE CASCADE,
  INDEX idx_possale_shift (shift_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pos_sale_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sale_id      INT NOT NULL,
  product_slug VARCHAR(160) NOT NULL,
  sku          VARCHAR(60) NOT NULL DEFAULT '',
  name         VARCHAR(200) NOT NULL,
  size         VARCHAR(40) NOT NULL DEFAULT '',
  color        VARCHAR(60) NOT NULL DEFAULT '',
  quantity     INT NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  line_total   DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_positem_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id) ON DELETE CASCADE,
  INDEX idx_positem_sale (sale_id)
) ENGINE=InnoDB;

-- Promotions / coupon codes ----------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  code                VARCHAR(40) NOT NULL UNIQUE,
  description         VARCHAR(255) NULL,
  discount_type       ENUM('percentage','fixed','free_shipping') NOT NULL,
  discount_value      DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_order_amount    DECIMAL(10,2) NULL,
  max_discount_amount DECIMAL(10,2) NULL,
  start_date          DATETIME NULL,
  end_date            DATETIME NULL,
  usage_limit         INT NULL,
  usage_limit_per_user INT NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotion_usages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  promotion_id    INT NOT NULL,
  user_id         INT NOT NULL,
  order_ref       VARCHAR(40) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_usage_promo FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  CONSTRAINT fk_promo_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_promo_usage_promo (promotion_id),
  INDEX idx_promo_usage_user (user_id)
) ENGINE=InnoDB;

-- Password reset tokens --------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_token_hash (token_hash)
) ENGINE=InnoDB;

-- Wishlist --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  product_slug VARCHAR(160) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_product (user_id, product_slug),
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wishlist_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  product_slug VARCHAR(160) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  size        VARCHAR(40) NOT NULL,
  color       VARCHAR(60) NOT NULL,
  quantity    INT NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  line_total  DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id)
) ENGINE=InnoDB;
