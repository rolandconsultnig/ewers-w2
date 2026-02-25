/**
 * Applies call_participants guest support (nullable user_id, guest_display_name).
 * Run: npx tsx scripts/migrate-call-participants-guest.ts
 * Or: npm run db:migrate:call-participants
 *
 * This is separate from `drizzle-kit push` because push currently generates
 * DROP CONSTRAINT for primary key columns (e.g. "id_not_null"), which PostgreSQL
 * rejects with 42P16. Running this script applies only the call_participants changes.
 */
import { pool } from "../server/db";

async function main() {
  console.log("Applying call_participants guest support...");
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE "call_participants" ALTER COLUMN "user_id" DROP NOT NULL');
    console.log("  - user_id is now nullable");
  } catch (e: any) {
    if (e.code === "42701") {
      console.log("  - user_id already nullable");
    } else throw e;
  }
  try {
    await client.query('ALTER TABLE "call_participants" ADD COLUMN IF NOT EXISTS "guest_display_name" text');
    console.log("  - guest_display_name column added (or already exists)");
  } catch (e: any) {
    throw e;
  } finally {
    client.release();
  }
  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
