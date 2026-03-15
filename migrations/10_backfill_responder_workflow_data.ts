import { pool } from "../server/db";

async function main() {
  console.log("Starting migration: 10_backfill_responder_workflow_data...");

  try {
    await pool.query("BEGIN");

    // 1) Backfill response_teams.response_category based on existing type names
    console.log("Backfilling response_teams.response_category...");
    await pool.query(`
      UPDATE response_teams
      SET response_category = CASE
        WHEN response_category IS NOT NULL THEN response_category
        WHEN LOWER(type) LIKE '%security%' THEN 'kinetic'
        WHEN LOWER(type) LIKE '%military%' THEN 'kinetic'
        WHEN LOWER(type) LIKE '%police%' THEN 'kinetic'
        WHEN LOWER(type) LIKE '%medical%' THEN 'non_kinetic'
        WHEN LOWER(type) LIKE '%health%' THEN 'non_kinetic'
        WHEN LOWER(type) LIKE '%mediation%' THEN 'non_kinetic'
        WHEN LOWER(type) LIKE '%logistic%' THEN 'non_kinetic'
        ELSE 'non_kinetic'
      END
    `);

    // 2) Backfill incidents.processing_status for existing data
    console.log("Backfilling incidents.processing_status...");
    await pool.query(`
      UPDATE incidents
      SET processing_status = COALESCE(processing_status, 'draft')
    `);

    await pool.query("COMMIT");
    console.log("Migration 10 completed successfully.");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Migration 10 failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});

