import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { createAuditLog } from "../utils/audit";

const router = Router();

// Create evidence for a report
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        report_id,
        evidence_type,
        file_name,
        file_url,
        file_hash,
        description,
      } = req.body;

      if (!report_id || !evidence_type) {
        return res.status(400).json({
          status: "error",
          message: "Report ID and evidence type are required",
        });
      }

      // Make sure the report exists and check evidence creation access
      const report = await pool.query(
        `SELECT id, reporter_id
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

      const isOwner = report.rows[0].reporter_id === req.user!.id;
      const isModeratorOrAdmin = ["MODERATOR", "ADMIN"].includes(
        req.user!.role
      );

      if (!isOwner && !isModeratorOrAdmin) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to add evidence to this report",
        });
      }

      const result = await pool.query(
        `INSERT INTO evidence
         (
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           description
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           description,
           verification_status,
           created_at,
           updated_at`,
        [
          report_id,
          req.user!.id,
          evidence_type,
          file_name || null,
          file_url || null,
          file_hash || null,
          description || null,
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Evidence created successfully",
        evidence: result.rows[0],
      });
    } catch (error: any) {
      if (error.code === "22P02") {
        return res.status(400).json({
          status: "error",
          message: "Invalid evidence type",
        });
      }

      console.error("Failed to create evidence:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to create evidence",
      });
    }
  }
);

// Verify or reject evidence
router.patch(
  "/:id/verify",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { verification_status } = req.body;

      const allowedStatuses = ["PENDING", "VERIFIED", "REJECTED"];

      if (
        !verification_status ||
        !allowedStatuses.includes(verification_status)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "verification_status must be one of: PENDING, VERIFIED, REJECTED",
        });
      }

      const evidence = await pool.query(
        `SELECT id, verification_status
         FROM evidence
         WHERE id = $1`,
        [id]
      );

      if (evidence.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Evidence not found",
        });
      }

      const oldVerificationStatus = evidence.rows[0].verification_status;

      const updated = await pool.query(
        `UPDATE evidence
         SET
           verification_status = $1,
           updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           description,
           verification_status,
           created_at,
           updated_at`,
        [verification_status, id]
      );

      await createAuditLog({
        userId: req.user!.id,
        action: "EVIDENCE_VERIFICATION_UPDATED",
        entityType: "evidence",
        entityId: id,
        oldData: {
          verification_status: oldVerificationStatus,
        },
        newData: {
          verification_status,
        },
        req,
      });

      return res.json({
        status: "ok",
        message: "Evidence verification status updated successfully",
        evidence: updated.rows[0],
      });
    } catch (error) {
      console.error("Failed to verify evidence:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to update evidence verification status",
      });
    }
  }
);

// Get all evidence for a report
router.get(
  "/report/:reportId",
  async (req, res) => {
    try {
      const report = await pool.query(
        `SELECT id
         FROM reports
         WHERE id = $1`,
        [req.params.reportId]
      );

      if (report.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      const result = await pool.query(
        `SELECT
           e.id,
           e.report_id,
           e.uploaded_by,
           e.evidence_type,
           e.file_name,
           e.file_url,
           e.file_hash,
           e.description,
           e.verification_status,
           e.created_at,
           e.updated_at,
           json_build_object(
             'id', u.id,
             'username', u.username
           ) AS uploader
         FROM evidence e
         JOIN users u ON u.id = e.uploaded_by
         WHERE e.report_id = $1
         ORDER BY e.created_at DESC`,
        [req.params.reportId]
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        evidence: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch evidence:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch evidence",
      });
    }
  }
);

// Get one evidence item
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         e.id,
         e.report_id,
         e.uploaded_by,
         e.evidence_type,
         e.file_name,
         e.file_url,
         e.file_hash,
         e.description,
         e.verification_status,
         e.created_at,
         e.updated_at,
         json_build_object(
           'id', u.id,
           'username', u.username
         ) AS uploader
       FROM evidence e
       JOIN users u ON u.id = e.uploaded_by
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Evidence not found",
      });
    }

    res.json({
      status: "ok",
      evidence: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch evidence:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch evidence",
    });
  }
});

export default router;