import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env or set the environment variable, then run this script.");
    process.exit(1);
  }

  const safeUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log("Connecting to:", safeUrl);

  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationPath = path.resolve(__dirname, "../migrations/17_predictive_outputs.sql");

  try {
    await client.connect();

    console.log("Applying collected_data status normalization...");
    const r1 = await client.query(
      "UPDATE collected_data SET status = 'pending' WHERE status = 'unprocessed';"
    );
    console.log(` - unprocessed -> pending: ${r1.rowCount ?? 0} row(s)`);

    const r2 = await client.query("UPDATE collected_data SET status = 'failed' WHERE status = 'error';");
    console.log(` - error -> failed: ${r2.rowCount ?? 0} row(s)`);

    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    console.log("Applying migration:", migrationPath);
    const sql = fs.readFileSync(migrationPath, "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    console.log("Done. predictive_outputs migration applied.");
  } catch (err: any) {
    console.error("DB hotfix failed:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main();
