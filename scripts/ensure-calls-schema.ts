import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Ensuring call tables exist...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS call_sessions (
        id serial PRIMARY KEY,
        conversation_id integer REFERENCES conversations(id),
        incident_id integer,
        type text NOT NULL DEFAULT 'video',
        status text NOT NULL DEFAULT 'active',
        created_by integer NOT NULL REFERENCES users(id),
        started_at timestamp NOT NULL DEFAULT now(),
        ended_at timestamp
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS call_participants (
        id serial PRIMARY KEY,
        call_session_id integer NOT NULL REFERENCES call_sessions(id),
        user_id integer REFERENCES users(id),
        guest_display_name text,
        joined_at timestamp NOT NULL DEFAULT now(),
        left_at timestamp
      )
    `);

    // Backward compatibility for older DBs
    await client.query(`ALTER TABLE call_participants ALTER COLUMN user_id DROP NOT NULL`);
    await client.query(`ALTER TABLE call_participants ADD COLUMN IF NOT EXISTS guest_display_name text`);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_call_sessions_status_started_at ON call_sessions(status, started_at DESC)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_call_participants_call_session_id ON call_participants(call_session_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id)`
    );

    console.log("Call schema is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to ensure call schema:", error);
  process.exit(1);
});
