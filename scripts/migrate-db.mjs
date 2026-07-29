import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db-connection.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = path.join(root, "db", "migrations");
const baseline = process.argv.includes("--baseline-existing");
const files = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
const connection = await openDatabase({ multipleStatements: true });

try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(255) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  const [appliedRows] = await connection.query("SELECT migration_name, checksum FROM schema_migrations");
  const applied = new Map(appliedRows.map((row) => [row.migration_name, row.checksum]));

  for (const name of files) {
    const sql = await readFile(path.join(migrationDir, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Applied migration was modified: ${name}`);
      continue;
    }

    if (!baseline) {
      if (!sql.trim()) throw new Error(`Empty migration: ${name}`);
      await connection.query(sql);
    }
    await connection.execute(
      "INSERT INTO schema_migrations (migration_name, checksum) VALUES (?, ?)",
      [name, checksum]
    );
    console.log(`${baseline ? "Baselined" : "Applied"}: ${name}`);
  }
  console.log(`Database migrations are current (${files.length} tracked).`);
} finally {
  await connection.end();
}
