import { openDatabase } from "./db-connection.mjs";

const required = {
  users: ["id", "role", "admin_role", "session_version", "account_status", "is_wholesale_customer", "wholesale_since"],
  orders: ["id", "order_ref", "user_id", "customer_phone_2", "payment_ref", "payment_status", "paid_at", "inventory_reverted_at", "deleted_at"],
  order_items: ["order_id", "product_slug", "product_id", "variant_id", "quantity"],
  reseller_orders: ["id", "order_ref", "reseller_id", "customer_phone_2", "status", "payment_status", "deleted_at"],
  reseller_order_items: ["order_id", "product_id", "variant_id", "quantity"],
  pos_sales: ["id", "receipt_number", "customer_phone_2", "fulfillment_type", "delivery_status", "delivery_fee", "koombiyo_waybill_id", "koombiyo_status", "inventory_reverted_at", "deleted_at"],
  pos_sale_items: ["id", "sale_id", "variant_id", "quantity"],
  promotions: ["id", "image_data", "image_mime"],
  hero_slides: ["id", "image_data", "image_mime", "is_active"],
  site_settings: ["setting_key", "setting_value", "updated_at"],
  withdrawals: ["id", "withdraw_ref", "reseller_id", "status"],
  schema_migrations: ["migration_name", "checksum", "applied_at"],
};

const connection = await openDatabase();
try {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`
  );
  const actual = new Map();
  for (const row of rows) {
    if (!actual.has(row.TABLE_NAME)) actual.set(row.TABLE_NAME, new Set());
    actual.get(row.TABLE_NAME).add(row.COLUMN_NAME);
  }

  const missing = [];
  for (const [table, columns] of Object.entries(required)) {
    if (!actual.has(table)) {
      missing.push(`table ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!actual.get(table).has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) throw new Error(`Database schema is incomplete: ${missing.join(", ")}`);
  console.log(`Database schema verified (${Object.keys(required).length} critical tables).`);
} finally {
  await connection.end();
}
