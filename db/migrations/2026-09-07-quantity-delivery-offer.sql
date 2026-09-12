CREATE TABLE IF NOT EXISTS delivery_offer_snapshots (
  channel VARCHAR(20) NOT NULL,
  order_reference VARCHAR(100) NOT NULL,
  delivery_fee DECIMAL(12,2) NOT NULL,
  offer_name VARCHAR(120) NULL,
  PRIMARY KEY (channel, order_reference)
) ENGINE=InnoDB;

ALTER TABLE site_settings MODIFY COLUMN setting_value TEXT NOT NULL;
