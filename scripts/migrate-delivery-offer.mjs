import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { openDatabase } from "./db-connection.mjs";
const name = "2026-09-07-quantity-delivery-offer.sql";
const sql = await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8");
const checksum = createHash("sha256").update(sql).digest("hex");
const db = await openDatabase({ multipleStatements: true });
try {
  const [rows] = await db.execute("SELECT checksum FROM schema_migrations WHERE migration_name = ?", [name]);
  if (rows.length) {
    if (rows[0].checksum !== checksum) throw new Error("Applied migration checksum does not match");
    console.log("Delivery offer migration already applied.");
  } else {
    await db.query(sql);
    await db.execute("INSERT INTO schema_migrations (migration_name, checksum) VALUES (?, ?)", [name, checksum]);
    console.log("Applied delivery offer migration only.");
  }
} finally { await db.end(); }
