import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest, requireRole } from "../middleware/auth";

const router = Router();

// Get all disputes (Moderator/Admin)
router.get(
  "/",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (_req: AuthenticatedRequest, res) => {
    try {
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
         ORDER BY created_at DESC`
      );

      res.json({
        status: "ok",
        disputes: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch disputes:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch disputes",
      });
    }
  }
);

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

router.patch(
  "/:id/review",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { result, review_notes } = req.body;

      const allowedResults = ["PENDING", "UPHELD", "REJECTED"];

      if (!result || !allowedResults.includes(result)) {
        return res.status(400).json({
          status: "error",
          message: "Result must be one of: PENDING, UPHELD, REJECTED",
        });
      }

      const dispute = await pool.query(
        `SELECT id
         FROM disputes
         WHERE id = $1`,
        [id]
      );

      if (dispute.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Dispute not found",
        });
      }

      const updated = await pool.query(
        `UPDATE disputes
         SET
           result = $1,
           reviewed_by = $2,
           review_notes = $3
         WHERE id = $4
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
        [result, req.user!.id, review_notes ?? null, id]
      );

      res.json({
        status: "ok",
        message: "Dispute reviewed successfully",
        dispute: updated.rows[0],
      });
    } catch (error) {
      console.error("Failed to review dispute:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to review dispute",
      });
    }
  }
);

export default router;