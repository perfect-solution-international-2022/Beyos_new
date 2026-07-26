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
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    namedPlaceholders: true,
    dateStrings: true,
  });

// Next.js route bundles can evaluate this module independently. Keep one pool
// per Node process in production too, avoiding needless connections and TLS/
// socket setup while moving between storefront and admin APIs.
globalForDb.beyosPool = pool;

export async function query<T = any>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}
