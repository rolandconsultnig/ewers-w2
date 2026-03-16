import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Add it to .env or set the environment variable, then run the migration script."
    );
    process.exit(1);
  }

  console.log("Starting migration: responderAgency + incident_dispatches...");

  try {
    await pool.query("BEGIN");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS responder_agency TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS incident_dispatches (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER NOT NULL REFERENCES incidents(id),
        agency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        comment TEXT,
        dispatched_by INTEGER REFERENCES users(id),
        dispatched_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS incident_dispatches_incident_id_idx
      ON incident_dispatches(incident_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS incident_dispatches_agency_idx
      ON incident_dispatches(agency);
    `);

    await pool.query("COMMIT");
    console.log("Migration 16 completed successfully.");
  } catch (error) {
    await pool.query("ROLLBACK");
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
