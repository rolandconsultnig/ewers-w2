import "dotenv/config";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pg from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedResponderAdmin() {
  const username = "adminres";
  const password = "admin123";
  const fullName = "Responder Portal Admin";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Set it in .env or the environment.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      console.log("Responder admin user (adminres) already exists. Skipping seed.");
      return;
    }

    const hashedPassword = await hashPassword(password);
    await client.query(
      `INSERT INTO users (username, password, full_name, role, security_level, permissions, active)
       VALUES ($1, $2, $3, 'admin', 7, $4, true)`,
      [username, hashedPassword, fullName, JSON.stringify(["view", "create", "update", "delete", "manage"])]
    );

    console.log("Responder portal admin user created successfully!");
    console.log("  Username: adminres");
    console.log("  Password: admin123");
    console.log("  Use these credentials at /responder/login");
  } finally {
    await client.end();
  }
}

seedResponderAdmin().catch(console.error).finally(() => process.exit(0));
