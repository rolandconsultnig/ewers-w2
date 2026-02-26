import "dotenv/config";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool, db } from "../server/db";
import { users } from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createGlobalUser() {
  try {
    const hashedPassword = await hashPassword("admin123");

    const [user] = await db
      .insert(users)
      .values({
        username: "global",
        password: hashedPassword,
        fullName: "Global Admin",
        role: "admin",
        securityLevel: 7,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: { password: hashedPassword, fullName: "Global Admin", role: "admin", securityLevel: 7 },
      })
      .returning();

    console.log("Global user created or updated:", user?.username);
    console.log("  Username: global");
    console.log("  Password: admin123");
  } catch (error) {
    console.error("Error creating global user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createGlobalUser();
