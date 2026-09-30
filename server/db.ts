import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to your .env file to enable PostgreSQL storage.",
    );
  }

  return db;
}
