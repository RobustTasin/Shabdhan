import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import path from "path";


dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

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
    error: error instanceof Error ? error.message : String(error),
  });
}
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Shabdhan API running on port ${PORT}`);
});
