/**
 * Applies additive SQL files under migrations/*.sql once per database.
 * Skips Drizzle baseline dumps (0000_*.sql) — those use CREATE without IF NOT EXISTS.
 *
 * Usage: DATABASE_URL=... npm run db:migrate:sql
 * Managed SSL: npm run db:migrate:sql:managed
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pgConnectionOptions } from "../server/pg-config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new pg.Client(pgConnectionOptions(url));
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _applied_sql_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const all = await readdir(MIGRATIONS_DIR);
    const sqlFiles = all
      .filter((f) => f.endsWith(".sql") && !f.startsWith("0000_"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const applied = new Set<string>();
    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM _applied_sql_migrations",
    );
    for (const r of rows) applied.add(r.filename);

    for (const filename of sqlFiles) {
      if (applied.has(filename)) {
        console.log(`[skip] ${filename} (already applied)`);
        continue;
      }

      const path = join(MIGRATIONS_DIR, filename);
      const body = await readFile(path, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(body);
        await client.query("INSERT INTO _applied_sql_migrations (filename) VALUES ($1)", [
          filename,
        ]);
        await client.query("COMMIT");
        console.log(`[ok] ${filename}`);
      } catch (e) {
        await client.query("ROLLBACK");
        console.error(`[fail] ${filename}`);
        throw e;
      }
    }

    console.log("SQL migrations finished.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
