import { pool } from "../server/db";

async function main() {
  console.log("Starting migration: add E2EE message fields and conversation_keys table...");

  try {
    await pool.query("BEGIN");

    // Add optional cipher fields to messages table (if they don't already exist)
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS ciphertext TEXT,
      ADD COLUMN IF NOT EXISTS nonce TEXT,
      ADD COLUMN IF NOT EXISTS algorithm TEXT,
      ADD COLUMN IF NOT EXISTS sender_device_id TEXT;
    `);

    // Create conversation_keys table for per-conversation keys
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_keys (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        encrypted_key TEXT NOT NULL,
        algorithm TEXT NOT NULL DEFAULT 'xchacha20-poly1305',
        device_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query("COMMIT");
    console.log("Migration completed successfully.");
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

