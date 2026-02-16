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

async function seedAdmin() {
  const username = "admin";
  const password = "admin123";
  const fullName = "System Administrator";

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

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

seedAdmin().catch(console.error).finally(() => process.exit(0));
