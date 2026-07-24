-- POS never understood product variations — sales were always priced/stocked
-- against the parent product row. This lets a POS sale line reference the
-- exact variant sold, so variable products can be sold correctly.
ALTER TABLE pos_sale_items
  ADD COLUMN variant_id INT NULL,
  ADD CONSTRAINT fk_positem_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
