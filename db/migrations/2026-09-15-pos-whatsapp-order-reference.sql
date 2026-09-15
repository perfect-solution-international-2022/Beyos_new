ALTER TABLE pos_sales
  ADD COLUMN whatsapp_order_ref VARCHAR(100) NULL AFTER customer_phone_2;

CREATE INDEX idx_pos_sales_whatsapp_order_ref ON pos_sales (whatsapp_order_ref);
