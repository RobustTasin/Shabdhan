import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { pool } from "./config/database";

import categoriesRouter from "./routes/categories";
import reportsRouter from "./routes/reports";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import socialAccountsRouter from "./routes/socialAccounts";
import evidenceRouter from "./routes/evidence";
import corroborationsRouter from "./routes/corroborations";
import disputesRouter from "./routes/disputes";
import auditLogsRouter from "./routes/auditLogs";
import commentsRouter from "./routes/comments";
import riskScoresRouter from "./routes/riskScores";
import notificationsRouter from "./routes/notifications";

dotenv.config({ path: ".env.local" });

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/categories", categoriesRouter);

app.use("/api/reports", reportsRouter);

app.use("/api/auth", authRouter);

app.use("/api/users", usersRouter);

app.use("/api/social-accounts", socialAccountsRouter);

app.use("/api/evidence", evidenceRouter);

app.use("/api/corroborations", corroborationsRouter);

app.use("/api/disputes", disputesRouter);

app.use("/api/audit-logs", auditLogsRouter);

app.use("/api/comments", commentsRouter);

app.use("/api/risk-scores", riskScoresRouter);

app.use("/api/notifications", notificationsRouter);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (_req, res) => {
  try {
    console.log("HEALTH CHECK: starting PostgreSQL test");

    console.log(
      "DATABASE_URL exists:",
      Boolean(process.env.DATABASE_URL)
    );

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing from Render environment");
    }

    const result = await pool.query(
      "SELECT current_database(), current_user"
    );

    res.json({
      status: "ok",
      service: "Shabdhan API",
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
    });
  } catch (error) {
    console.error("POSTGRES TEST ERROR:", error);

    const dbError = error as {
      message?: string;
      code?: string;
      errno?: string | number;
      address?: string;
      port?: string | number;
      syscall?: string;
      detail?: string;
      hint?: string;
    };

    res.status(503).json({
      status: "error",
      service: "Shabdhan API",
      database: "unavailable",
      error: {
        message: dbError.message || null,
        code: dbError.code || null,
        errno: dbError.errno || null,
        address: dbError.address || null,
        port: dbError.port || null,
        syscall: dbError.syscall || null,
        detail: dbError.detail || null,
        hint: dbError.hint || null,
      },
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(
    `Shabdhan API running on port ${PORT}`
  );
});