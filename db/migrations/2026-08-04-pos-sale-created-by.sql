ALTER TABLE pos_sales
  ADD COLUMN created_by INT NULL AFTER cashier_id,
  ADD CONSTRAINT fk_possale_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_possale_created_by (created_by);
