-- Unify POS walk-in customers into the main users table so they get full
-- admin management (role, wholesale, account status) exactly like any other
-- customer, and so POS sales can apply wholesale pricing for them.
ALTER TABLE users
  ADD COLUMN account_source ENUM('web','pos') NOT NULL DEFAULT 'web' AFTER role;

ALTER TABLE pos_sales
  ADD COLUMN customer_id INT NULL AFTER created_by,
  ADD CONSTRAINT fk_possale_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_possale_customer (customer_id);
