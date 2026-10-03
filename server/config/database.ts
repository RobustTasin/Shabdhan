import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const useSSL = process.env.DATABASE_SSL === "true";

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error
  );
});