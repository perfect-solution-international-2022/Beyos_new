import { query } from "./db";

const MAINTENANCE_KEY = "maintenance_mode";

export async function getMaintenanceMode(): Promise<boolean> {
  const rows = await query<{ setting_value: string }>(
    "SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1",
    [MAINTENANCE_KEY]
  );
  return rows[0]?.setting_value === "1";
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await query(
    `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [MAINTENANCE_KEY, enabled ? "1" : "0"]
  );
}
