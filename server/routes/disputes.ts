import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Get disputes for a report
router.get(
  "/report/:reportId",
  async (req, res) => {
    try {
      const { reportId } = req.params;

      const result = await pool.query(
        `SELECT
           id,
           report_id,
           submitted_by,
           reason,
           result,
           reviewed_by,
           review_notes,
           created_at,
           updated_at
         FROM disputes
         WHERE report_id = $1
         ORDER BY created_at DESC`,
        [reportId]
      );

      res.json({
        status: "ok",
        disputes: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch disputes for report:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch disputes",
      });
    }
  }
);

// Get a single dispute
router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
           id,
           report_id,
           submitted_by,
           reason,
           result,
           reviewed_by,
           review_notes,
           created_at,
           updated_at
         FROM disputes
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Dispute not found",
        });
      }

      res.json({
        status: "ok",
        dispute: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch dispute:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch dispute",
      });
    }
  }
);

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