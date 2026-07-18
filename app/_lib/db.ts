import mysql, { Pool } from "mysql2/promise";
import { initDb } from "./initDb";

let pool:        Pool | null = null;
let initialized: boolean     = false;

export async function getPool(): Promise<Pool> {
  if (!initialized) {
    await initDb();
    initialized = true;
  }

  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || "localhost",
      port:               Number(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || "root",
      password:           process.env.DB_PASSWORD || "",
      database:           process.env.DB_NAME     || "pos_db",
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    });
  }

  return pool;
}