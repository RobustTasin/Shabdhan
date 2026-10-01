import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";

const router = Router();

function calculateRiskScore(data: {
  verificationStatus: string;
  verifiedEvidence: number;
  pendingEvidence: number;
  rejectedEvidence: number;
  corroborations: number;
  reportAgeDays: number;
}) {
  let score = 0;

  // Report verification
  if (data.verificationStatus === "VERIFIED") {
    score += 25;
  } else if (data.verificationStatus === "PENDING") {
    score += 10;
  }

  // Evidence strength
  score += data.verifiedEvidence * 15;
  score += data.pendingEvidence * 5;
  score -= data.rejectedEvidence * 5;

  // Independent corroborations
  score += Math.min(data.corroborations * 10, 30);

  // Recency
  if (data.reportAgeDays <= 7) {
    score += 10;
  } else if (data.reportAgeDays <= 30) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

// Get latest risk score for a report
router.get(
  "/:reportId",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           rs.id,
           rs.report_id,
           rs.score,
           rs.explanation,
           rs.calculated_at
         FROM risk_scores rs
         WHERE rs.report_id = $1
         ORDER BY rs.calculated_at DESC
         LIMIT 1`,
        [req.params.reportId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Risk score not found",
        });
      }

      res.json({
        status: "ok",
        risk_score: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch risk score:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch risk score",
      });
    }
  }
);

// Get all risk scores
router.get(
  "/",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           rs.id,
           rs.report_id,
           rs.score,
           rs.explanation,
           rs.calculated_at
         FROM risk_scores rs
         ORDER BY rs.calculated_at DESC`
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        risk_scores: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch risk scores:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch risk scores",
      });
    }
  }
);

// Calculate and store a new risk score
router.post(
  "/:reportId/calculate",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportResult = await pool.query(
        `SELECT
           id,
           verification_status,
           created_at
         FROM reports
         WHERE id = $1`,
        [req.params.reportId]
      );

      if (reportResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      const report = reportResult.rows[0];

      const evidenceResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE verification_status = 'VERIFIED'
           ) AS verified_evidence,
           COUNT(*) FILTER (
             WHERE verification_status = 'PENDING'
           ) AS pending_evidence,
           COUNT(*) FILTER (
             WHERE verification_status = 'REJECTED'
           ) AS rejected_evidence
         FROM evidence
         WHERE report_id = $1`,
        [req.params.reportId]
      );

      const corroborationResult = await pool.query(
        `SELECT COUNT(*) AS corroborations
         FROM corroborations
         WHERE report_id = $1`,
        [req.params.reportId]
      );

      const evidence = evidenceResult.rows[0];

      const verifiedEvidence = Number(evidence.verified_evidence);
      const pendingEvidence = Number(evidence.pending_evidence);
      const rejectedEvidence = Number(evidence.rejected_evidence);
      const corroborations = Number(
        corroborationResult.rows[0].corroborations
      );

      const reportAgeDays = Math.floor(
        (Date.now() - new Date(report.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const score = calculateRiskScore({
        verificationStatus: report.verification_status,
        verifiedEvidence,
        pendingEvidence,
        rejectedEvidence,
        corroborations,
        reportAgeDays,
      });

      const explanation =
        `Verification: ${report.verification_status}; ` +
        `verified evidence: ${verifiedEvidence}; ` +
        `pending evidence: ${pendingEvidence}; ` +
        `rejected evidence: ${rejectedEvidence}; ` +
        `corroborations: ${corroborations}; ` +
        `report age: ${reportAgeDays} days.`;

      const result = await pool.query(
        `INSERT INTO risk_scores (
           report_id,
           score,
           explanation
         )
         VALUES ($1, $2, $3)
         RETURNING
           id,
           report_id,
           score,
           explanation,
           calculated_at`,
        [req.params.reportId, score, explanation]
      );

      res.status(201).json({
        status: "ok",
        message: "Risk score calculated successfully",
        risk_score: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to calculate risk score:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to calculate risk score",
      });
    }
  }
);

export default router;