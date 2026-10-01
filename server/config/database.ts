import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "shabdhan",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
