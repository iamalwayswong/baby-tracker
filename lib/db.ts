import { Pool } from "pg";

// One shared pool per process. Cached on globalThis so the custom server
// (server.ts) and Next's route handlers — which may be separate module
// instances — reuse the same connections instead of each opening a pool.
const g = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!g.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    g.__pgPool = new Pool({
      connectionString,
      // Railway Postgres requires SSL; local dev usually does not.
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    });
  }
  return g.__pgPool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
