/**
 * Quick check: election monitoring tables exist in public schema.
 * Usage: node scripts/verify-election-tables.cjs
 * Requires DATABASE_URL in .env (dotenv loads from cwd).
 */
require("dotenv").config();
const { Client } = require("pg");

const TABLES = [
  "elections",
  "political_parties",
  "politicians",
  "election_actors",
  "election_events",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Table verification (public schema):");
    let allOk = true;
    for (const table of TABLES) {
      const { rows } = await client.query(
        "select to_regclass($1) as reg",
        [`public.${table}`]
      );
      const ok = Boolean(rows[0]?.reg);
      if (!ok) allOk = false;
      console.log(`${ok ? "OK   " : "MISS "} ${table}`);
    }
    process.exitCode = allOk ? 0 : 2;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
