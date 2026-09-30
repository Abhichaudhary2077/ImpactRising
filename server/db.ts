import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

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
