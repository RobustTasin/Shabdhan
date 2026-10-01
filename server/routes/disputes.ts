import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Submit a dispute
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { report_id, reason } = req.body;

      if (!report_id || !reason) {
        return res.status(400).json({
          status: "error",
          message: "Report ID and reason are required",
        });
      }

      // Make sure the referenced report exists
      const report = await pool.query(
        `SELECT id
         FROM reports
         WHERE id = $1`,
        [report_id]
      );

      if (report.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      // submitted_by comes from the authenticated user
      const result = await pool.query(
        `INSERT INTO disputes
         (report_id, submitted_by, reason)
         VALUES ($1, $2, $3)
         RETURNING
           id,
           report_id,
           submitted_by,
           reason,
           result,
           reviewed_by,
           review_notes,
           created_at,
           updated_at`,
        [report_id, req.user!.id, reason]
      );

      res.status(201).json({
        status: "ok",
        message: "Dispute submitted successfully",
        dispute: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to submit dispute:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to submit dispute",
      });
    }
  }
);

export default router;