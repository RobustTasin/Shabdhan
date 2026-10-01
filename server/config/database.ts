import { Pool } from "pg";

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://TASEEN@localhost:5432/shabdhan",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
