-- Repair a production schema that had order_items stock-hold columns applied
-- without the matching idempotency marker on orders.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS inventory_reverted_at TIMESTAMP NULL AFTER koombiyo_updated_at;
