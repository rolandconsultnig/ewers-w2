import "dotenv/config";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pg from "pg";
import { pgConnectionOptions } from "../server/pg-config";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedAdmin() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Add it to .env or export it before seeding.");
    process.exitCode = 1;
    return;
  }

  const username = "admin";
  const password = "admin123";
  const fullName = "System Administrator";

  const client = new pg.Client(pgConnectionOptions(process.env.DATABASE_URL));

  try {
    await client.connect();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (msg.includes("SELF_SIGNED_CERT") || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
      console.error(
        "\nSSL certificate error (common on DigitalOcean / Neon / managed Postgres).\n" +
          "Fix one of:\n" +
          "  1) Add to .env:  DATABASE_SSL_NO_VERIFY=true\n" +
          "  2) Run:          npm run db:seed:managed\n",
      );
    } else if (code === "28P01" || msg.toLowerCase().includes("password authentication failed")) {
      console.error(
        "\nDatabase rejected the password (code 28P01).\n" +
          "Update DATABASE_URL on this server with the correct user/password from your DB provider (e.g. doadmin).\n",
      );
    }
    throw e;
  }

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      console.log("Admin user already exists. Skipping seed.");
      return;
    }

    const hashedPassword = await hashPassword(password);
    await client.query(
      `INSERT INTO users (username, password, full_name, role, security_level, permissions, active)
       VALUES ($1, $2, $3, 'admin', 7, $4, true)`,
      [username, hashedPassword, fullName, JSON.stringify(["view", "create", "update", "delete", "manage"])]
    );

    console.log("Admin user created successfully!");
    console.log("  Username: admin");
    console.log("  Password: admin123");
  } finally {
    await client.end();
  }
}

seedAdmin()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
