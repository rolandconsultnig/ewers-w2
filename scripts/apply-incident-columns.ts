/**
 * One-off: add town + incident_occurred_at if missing (when drizzle push fails on drift).
 */
import "dotenv/config";
import pg from "pg";
import { pgConnectionOptions } from "../server/pg-config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const client = new pg.Client(pgConnectionOptions(url));
  await client.connect();
  await client.query(`
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS town text;
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_occurred_at timestamp;
  `);
  console.log("Columns town / incident_occurred_at ensured.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
