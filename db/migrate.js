// Applies db/schema.sql to the database in DATABASE_URL. Idempotent.
// Plain Node (no tsx) so it runs at deploy time even when dev deps are pruned.
require("dotenv").config({ path: [".env.local", ".env"] });
const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");

function sslConfig(cs) {
  if (process.env.PGSSL === "false") return false;
  if (process.env.PGSSL === "true") return { rejectUnauthorized: false };
  if (!cs || cs.includes(".railway.internal") || cs.includes("localhost")) return false;
  return { rejectUnauthorized: false };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  const pool = new Pool({ connectionString, ssl: sslConfig(connectionString) });
  await pool.query(sql);
  console.log("✓ schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
