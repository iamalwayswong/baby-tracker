// Applies db/schema.sql to the database in DATABASE_URL. Idempotent.
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });
import { readFileSync } from "fs";
import { join } from "path";
import { getPool } from "../lib/db";

async function main() {
  const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  const pool = getPool();
  await pool.query(sql);
  console.log("✓ schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
