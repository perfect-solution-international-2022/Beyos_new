ALTER TABLE users
  ADD COLUMN is_wholesale_customer TINYINT(1) NOT NULL DEFAULT 0 AFTER account_status,
  ADD COLUMN wholesale_since TIMESTAMP NULL AFTER is_wholesale_customer,
  ADD INDEX idx_users_wholesale (is_wholesale_customer, role, deleted_at);
