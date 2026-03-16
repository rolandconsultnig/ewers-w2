import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env or set the environment variable.");
    process.exit(1);
  }

  console.log("Starting migration: workflow process maker (templates, stages, transitions, instances, history)...");

  try {
    await pool.query("BEGIN");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        activity_type TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_stages (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        stage_order INTEGER NOT NULL,
        allowed_roles TEXT[]
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
        from_stage_id INTEGER NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
        to_stage_id INTEGER NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
        allowed_roles TEXT[]
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        current_stage_id INTEGER NOT NULL REFERENCES workflow_stages(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_history (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        from_stage_id INTEGER REFERENCES workflow_stages(id),
        to_stage_id INTEGER REFERENCES workflow_stages(id),
        moved_by INTEGER REFERENCES users(id),
        comment TEXT,
        moved_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Useful indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workflow_templates_entity ON workflow_templates(entity_type, activity_type);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workflow_stages_template ON workflow_stages(template_id, stage_order);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workflow_history_instance ON workflow_history(instance_id, moved_at DESC);`);

    await pool.query("COMMIT");
    console.log("Migration 15 completed successfully.");
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
