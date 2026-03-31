require("dotenv").config();
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query(
      "select count(*)::int as c from incidents where reporting_method = $1 and reported_by = $2",
      ["voice", 1]
    );
    const del = await client.query(
      "delete from incidents where reporting_method = $1 and reported_by = $2",
      ["voice", 1]
    );
    await client.query("COMMIT");

    const after = await client.query(
      "select count(*)::int as c from incidents where reporting_method = $1",
      ["voice"]
    );

    console.log(JSON.stringify({
      deleted: del.rowCount,
      beforeMatching: before.rows[0].c,
      remainingVoice: after.rows[0].c,
    }, null, 2));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
