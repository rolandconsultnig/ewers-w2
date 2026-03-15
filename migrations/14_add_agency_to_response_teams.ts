import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env or set the environment variable, then run: npm run db:migrate:agency");
    process.exit(1);
  }
  console.log("Adding agency column to response_teams for agency-specific dashboards...");

  try {
    await pool.query(`
      ALTER TABLE response_teams
      ADD COLUMN IF NOT EXISTS agency TEXT;
    `);
    console.log("Migration 14 completed: response_teams.agency added.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
