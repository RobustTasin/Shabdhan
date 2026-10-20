import express from "express";
import cors from "cors";
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
import membershipApplicationsRouter from "./routes/membershipApplications";
import passwordResetApplicationsRouter from "./routes/passwordResetApplications";


const app = express();


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

app.use("/api/membership-applications", membershipApplicationsRouter);
app.use("/api/password-reset-applications", passwordResetApplicationsRouter);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      status: "ok",
      service: "Shabdhan API",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(503).json({
      status: "error",
      service: "Shabdhan API",
      database: "unavailable",
    });
  }
});

// ============================================================

export default app;
