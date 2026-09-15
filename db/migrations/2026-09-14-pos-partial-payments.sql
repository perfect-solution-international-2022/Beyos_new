ALTER TABLE pos_sales
  ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' AFTER payment_method,
  ADD COLUMN paid_amount DECIMAL(10,2) NULL AFTER payment_status;

CREATE INDEX idx_pos_sales_payment_status ON pos_sales (payment_status);
