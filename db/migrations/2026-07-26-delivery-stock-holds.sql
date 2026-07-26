-- Reserve storefront delivery stock when an order is placed and make returns idempotent.
ALTER TABLE orders
  ADD COLUMN inventory_reverted_at TIMESTAMP NULL AFTER koombiyo_updated_at;

ALTER TABLE order_items
  ADD COLUMN product_id INT NULL AFTER product_slug,
  ADD COLUMN variant_id INT NULL AFTER product_id,
  ADD INDEX idx_order_item_product (product_id),
  ADD INDEX idx_order_item_variant (variant_id);

UPDATE order_items oi
JOIN products p ON p.slug = oi.product_slug
SET oi.product_id = p.id
WHERE oi.product_id IS NULL;
