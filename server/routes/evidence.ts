import { Router } from "express";
import crypto from "crypto";
import { cloudinary } from "../config/cloudinary";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import { uploadEvidence } from "../middleware/upload";
import { createNotification } from "../utils/notifications";

const router = Router();

// Get evidence attached to reports owned by the authenticated user
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
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
           r.title AS report_title,
           json_build_object(
             'id', u.id,
             'username', u.username
           ) AS uploader
         FROM evidence e
         JOIN reports r ON r.id = e.report_id
         JOIN users u ON u.id = e.uploaded_by
         WHERE r.reporter_id = $1
         ORDER BY e.created_at DESC, e.id DESC`,
        [req.user!.id]
      );

      return res.json({
        status: "ok",
        count: result.rows.length,
        evidence: result.rows,
      });
    } catch (error) {
      console.error(
        "Failed to fetch user evidence:",
        error
      );

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch evidence",
      });
    }
  }
);

// Upload evidence file
router.post(
  "/upload",
  authenticate,
  uploadEvidence.single("file"),
  async (req: AuthenticatedRequest, res) => {
    let cloudinaryPublicId: string | null = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Evidence file is required",
        });
      }

      const { report_id, description } = req.body;

      if (!report_id) {
        return res.status(400).json({
          status: "error",
          message: "Report ID is required",
        });
      }

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
          message:
            "You do not have permission to add evidence to this report",
        });
      }

      const evidenceTypeMap: Record<string, string> = {
        "image/jpeg": "IMAGE",
        "image/png": "IMAGE",
        "image/webp": "IMAGE",
        "video/mp4": "VIDEO",
        "video/webm": "VIDEO",
        "application/pdf": "DOCUMENT",
      };

      const evidenceType = evidenceTypeMap[req.file.mimetype];

      if (!evidenceType) {
        return res.status(400).json({
          status: "error",
          message: "Unsupported evidence type",
        });
      }

      const fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      const resourceType =
        req.file.mimetype === "application/pdf"
          ? "raw"
          : evidenceType === "VIDEO"
            ? "video"
            : "image";

      const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "shabdhan/evidence",
            resource_type: resourceType,
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error("Cloudinary upload failed"));
              return;
            }

            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );

        uploadStream.end(req.file.buffer);
      });

      cloudinaryPublicId = uploadResult.public_id;

      const result = await pool.query(
        `INSERT INTO evidence
         (
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           cloudinary_public_id,
           description
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           id,
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           cloudinary_public_id,
           description,
           verification_status,
           created_at,
           updated_at`,
        [
          report_id,
          req.user!.id,
          evidenceType,
          req.file.originalname,
          uploadResult.secure_url,
          fileHash,
          cloudinaryPublicId,
          description || null,
        ]
      );

      cloudinaryPublicId = null;

      return res.status(201).json({
        status: "ok",
        message: "Evidence file uploaded successfully",
        evidence: result.rows[0],
      });
    } catch (error: any) {
      if (cloudinaryPublicId) {
        try {
          const resourceType =
            req.file?.mimetype === "application/pdf"
              ? "raw"
              : req.file?.mimetype?.startsWith("video/")
                ? "video"
                : "image";

          await cloudinary.uploader.destroy(cloudinaryPublicId, {
            resource_type: resourceType,
          });
        } catch (cleanupError) {
          console.error(
            "Failed to clean up Cloudinary upload:",
            cleanupError
          );
        }
      }

      console.error("Failed to upload evidence:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to upload evidence file",
      });
    }
  }
);

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
          message:
            "You do not have permission to add evidence to this report",
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

      // Notify the user who uploaded the evidence
      if (oldVerificationStatus !== verification_status) {
        try {
          const evidenceDetails = await pool.query(
            `SELECT
               e.uploaded_by,
               r.title
             FROM evidence e
             JOIN reports r ON r.id = e.report_id
             WHERE e.id = $1`,
            [id]
          );

          if (evidenceDetails.rows.length > 0) {
            const { uploaded_by, title } = evidenceDetails.rows[0];

            await createNotification({
              userId: uploaded_by,
              type:
                verification_status === "VERIFIED"
                  ? "EVIDENCE_VERIFIED"
                  : verification_status === "REJECTED"
                    ? "EVIDENCE_REJECTED"
                    : "EVIDENCE_STATUS_UPDATED",
              title:
                verification_status === "VERIFIED"
                  ? "Evidence verified"
                  : verification_status === "REJECTED"
                    ? "Evidence rejected"
                    : "Evidence status updated",
              message: `Your evidence for the report "${title}" is now ${verification_status.toLowerCase()}.`,
              entityType: "evidence",
              entityId: id,
            });
          }
        } catch (notificationError) {
          console.error(
            "Failed to create evidence notification:",
            notificationError
          );
        }
      }

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