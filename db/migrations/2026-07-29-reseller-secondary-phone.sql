ALTER TABLE reseller_orders
  ADD COLUMN IF NOT EXISTS customer_phone_2 VARCHAR(40) NULL AFTER customer_phone;
