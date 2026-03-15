import { pool } from "../server/db";

async function main() {
  console.log("Starting migration: responder workflow (incident_discussions, routing fields)...");

  try {
    await pool.query("BEGIN");

    // Add processing/routing columns to incidents
    await pool.query(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS proposed_responder_type TEXT,
      ADD COLUMN IF NOT EXISTS final_responder_type TEXT,
      ADD COLUMN IF NOT EXISTS assigned_responder_team_id INTEGER REFERENCES response_teams(id),
      ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS coordinator_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS routed_at TIMESTAMP;
    `);

    // Incident discussion thread
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incident_discussions (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER NOT NULL REFERENCES incidents(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Response teams: category for kinetic / non_kinetic
    await pool.query(`
      ALTER TABLE response_teams
      ADD COLUMN IF NOT EXISTS response_category TEXT;
    `);

    // Response activities: link to team and type
    await pool.query(`
      ALTER TABLE response_activities
      ADD COLUMN IF NOT EXISTS assigned_team_id INTEGER REFERENCES response_teams(id),
      ADD COLUMN IF NOT EXISTS response_type TEXT;
    `);

    await pool.query("COMMIT");
    console.log("Migration 09 completed successfully.");
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
