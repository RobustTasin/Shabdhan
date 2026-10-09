import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createNotification } from "../utils/notifications";
import { createAuditLog } from "../utils/audit";
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
           d.id,
           d.report_id,
           d.submitted_by,
           d.reason,
           d.result,
           d.reviewed_by,
           d.review_notes,
           d.created_at,
           d.updated_at,
           r.title AS report_title
         FROM disputes d
         JOIN reports r ON r.id = d.report_id
         ORDER BY d.created_at DESC, d.id DESC`
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

// Get disputes against reports owned by the authenticated user
router.get(
  "/mine",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           d.id,
           d.report_id,
           d.submitted_by,
           d.reason,
           d.result,
           d.reviewed_by,
           d.review_notes,
           d.created_at,
           d.updated_at,
           r.title AS report_title
         FROM disputes d
         JOIN reports r ON r.id = d.report_id
         WHERE r.reporter_id = $1
         ORDER BY d.created_at DESC, d.id DESC`,
        [req.user!.id]
      );

      res.json({
        status: "ok",
        disputes: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch user disputes:", error);

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

// Review a dispute
router.patch(
  "/:id/review",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { result, review_notes } = req.body;

      const allowedResults = ["PENDING", "UPHELD", "REJECTED"];

      if (typeof result !== "string" || !allowedResults.includes(result)) {
        return res.status(400).json({
          status: "error",
          message: "Result must be one of: PENDING, UPHELD, REJECTED",
        });
      }

      if (
        review_notes !== undefined &&
        review_notes !== null &&
        typeof review_notes !== "string"
      ) {
        return res.status(400).json({
          status: "error",
          message: "Review notes must be a string or null",
        });
      }

      const normalizedNotes =
        typeof review_notes === "string" ? review_notes.trim() : null;

      if (normalizedNotes !== null && normalizedNotes.length > 5000) {
        return res.status(400).json({
          status: "error",
          message: "Review notes must not exceed 5000 characters",
        });
      }

      const client = await pool.connect();
      let updatedDispute;

      try {
        await client.query("BEGIN");

        const dispute = await client.query(
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
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );

        if (dispute.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            status: "error",
            message: "Dispute not found",
          });
        }

        const previous = dispute.rows[0];

        const updated = await client.query(
          `UPDATE disputes
           SET
             result = $1,
             reviewed_by = $2,
             review_notes = $3,
             updated_at = NOW()
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
          [result, req.user!.id, normalizedNotes, id]
        );

        updatedDispute = updated.rows[0];

        await createAuditLog({
          userId: req.user!.id,
          action: "DISPUTE_REVIEWED",
          entityType: "dispute",
          entityId: id,
          oldData: {
            result: previous.result,
            reviewed_by: previous.reviewed_by,
            review_notes: previous.review_notes,
          },
          newData: {
            result: updatedDispute.result,
            reviewed_by: updatedDispute.reviewed_by,
            review_notes: updatedDispute.review_notes,
          },
          req,
          client,
        });

        await client.query("COMMIT");
      } catch (transactionError) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back dispute review:", rollbackError);
        }

        throw transactionError;
      } finally {
        client.release();
      }

      // Notify the user who submitted the dispute
      try {
        const disputeDetails = await pool.query(
          `SELECT
             d.submitted_by,
             r.title
           FROM disputes d
           JOIN reports r ON r.id = d.report_id
           WHERE d.id = $1`,
          [id]
        );

        if (disputeDetails.rows.length > 0) {
          const { submitted_by, title } = disputeDetails.rows[0];

          await createNotification({
            userId: submitted_by,
            type:
              result === "UPHELD"
                ? "DISPUTE_UPHELD"
                : result === "REJECTED"
                  ? "DISPUTE_REJECTED"
                  : "DISPUTE_STATUS_UPDATED",
            title:
              result === "UPHELD"
                ? "Dispute upheld"
                : result === "REJECTED"
                  ? "Dispute rejected"
                  : "Dispute status updated",
            message: `Your dispute for the report "${title}" is now ${result.toLowerCase()}.`,
            entityType: "dispute",
            entityId: id,
          });
        }
      } catch (notificationError) {
        console.error(
          "Failed to create dispute notification:",
          notificationError
        );
      }

      return res.json({
        status: "ok",
        message: "Dispute reviewed successfully",
        dispute: updatedDispute,
      });
    } catch (error) {
      console.error("Failed to review dispute:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to review dispute",
      });
    }
  }
);

export default router;