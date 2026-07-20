import mysql from "mysql2/promise";

// A single shared connection pool, reused across hot-reloads in dev.
const globalForDb = globalThis as unknown as {
  beyosPool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.beyosPool ??
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "beyos",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.beyosPool = pool;
}

export async function query<T = any>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}
