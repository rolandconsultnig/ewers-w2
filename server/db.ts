import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// For managed DBs (DigitalOcean, etc.) with self-signed certs: set DATABASE_SSL_NO_VERIFY=true
const poolConfig: { connectionString: string; ssl?: { rejectUnauthorized: boolean } } = {
  connectionString: process.env.DATABASE_URL,
};
if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });
