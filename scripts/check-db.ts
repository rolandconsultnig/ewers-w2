/**
 * Verify database connection and seeding.
 * Run on the server: cd ~/ewers-w2 && npx tsx scripts/check-db.ts
 */
import "dotenv/config";
import pg from "pg";

async function checkDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  // Hide password in log
  const safeUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log("Connecting to:", safeUrl);

  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log("✅ Connection successful");

    const ping = await client.query("SELECT 1 AS ok");
    if (ping.rows[0]?.ok !== 1) {
      console.error("❌ Ping query failed");
      process.exit(1);
    }
    console.log("✅ Ping query OK");

    const users = await client.query(
      "SELECT id, username, full_name, role, active FROM users ORDER BY id LIMIT 10"
    );
    const count = users.rows.length;
    const totalResult = await client.query("SELECT count(*)::int AS n FROM users");
    const total = totalResult.rows[0]?.n ?? 0;

    console.log(`\n📋 Users table: ${total} row(s) total`);
    if (count === 0) {
      console.log("⚠️  No users found. Run: npm run db:seed");
    } else {
      console.log("First user(s):");
      users.rows.forEach((r) => {
        console.log(`   id=${r.id} username=${r.username} role=${r.role} active=${r.active}`);
      });
    }

    console.log("\n✅ Database check passed. Backend can use the same DATABASE_URL to connect.");
  } catch (err: any) {
    console.error("❌ Database error:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDb();
