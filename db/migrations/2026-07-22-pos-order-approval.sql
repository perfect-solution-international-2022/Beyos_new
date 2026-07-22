-- Tracks whether a POS delivery order's inventory has already been restored
-- (on reject/cancel), preventing double-restocking. Safe to re-run.
ALTER TABLE pos_sales
  ADD COLUMN IF NOT EXISTS inventory_reverted_at TIMESTAMP NULL;
