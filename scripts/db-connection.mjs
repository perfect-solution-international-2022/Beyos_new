import mysql from "mysql2/promise";

export function databaseConfig(extra = {}) {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "beyos",
    ...extra,
  };
}

export async function openDatabase(extra = {}) {
  return mysql.createConnection(databaseConfig(extra));
}
