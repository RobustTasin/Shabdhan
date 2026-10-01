import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/database";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.json({
      status: "ok",
      service: "Shabdhan API",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      service: "Shabdhan API",
      database: "unavailable",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Shabdhan API running on http://localhost:${PORT}`);
});
