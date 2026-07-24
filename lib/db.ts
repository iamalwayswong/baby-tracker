import { Pool } from "pg";

// One shared pool per process. Cached on globalThis so the custom server
// (server.ts) and Next's route handlers — which may be separate module
// instances — reuse the same connections instead of each opening a pool.
const g = globalThis as unknown as { __pgPool?: Pool };

/**
 * SSL config for pg. PGSSL forces it ("true"/"false"); otherwise auto-detect:
 * Railway's private network (*.railway.internal) does NOT serve SSL, so we must
 * NOT request it there. Public hosts (proxy.rlwy.net, most managed PG) do.
 */
export function sslConfig(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (process.env.PGSSL === "false") return false;
  if (process.env.PGSSL === "true") return { rejectUnauthorized: false };
  if (connectionString.includes(".railway.internal") || connectionString.includes("localhost")) return false;
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (!g.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    g.__pgPool = new Pool({ connectionString, ssl: sslConfig(connectionString) });
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
