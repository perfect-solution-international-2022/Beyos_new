-- Adds a site-wide settings table for admin-configurable delivery pricing
-- (base price for the first kg + price per additional kg), and a
-- delivery_fee column on pos_sales so POS delivery orders can charge it too.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key   VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE pos_sales
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0;
