-- Adds Koombiyo waybill tracking columns to pos_sales, so POS delivery
-- orders can use the same Request Waybill ID / Place Order flow as
-- customer and reseller orders. Safe to re-run.
ALTER TABLE pos_sales
  ADD COLUMN IF NOT EXISTS koombiyo_waybill_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS koombiyo_status     VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS koombiyo_response   JSON NULL,
  ADD COLUMN IF NOT EXISTS koombiyo_updated_at TIMESTAMP NULL;
