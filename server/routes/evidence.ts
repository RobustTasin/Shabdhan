import { Router } from "express";
import crypto from "crypto";
import { cloudinary } from "../config/cloudinary";
import { pool } from "../config/database";
import {
  authenticate,
  optionalAuthenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import {
  formatLimit,
  handleEvidenceUpload,
  hasMatchingFileSignature,
  maxBytesForMime,
} from "../middleware/upload";
import { createNotification } from "../utils/notifications";
import { withTransaction } from "../utils/transaction";

const router = Router();

// Get evidence attached to the authenticated user's reports. Moderators and
// admins can review evidence across all reports, matching the reports view.
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const canReviewAllReports = ["MODERATOR", "ADMIN"].includes(req.user!.role);
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
         WHERE ($1::boolean OR r.reporter_id = $2)
         ORDER BY e.created_at DESC, e.id DESC`,
        [canReviewAllReports, req.user!.id]
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

// Attach a public HTTPS evidence link (for example a shared cloud folder).
router.post(
  "/link",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = typeof req.body.report_id === "string" ? req.body.report_id.trim() : "";
      const rawUrl = typeof req.body.url === "string" ? req.body.url.trim() : "";
      const label = typeof req.body.label === "string" ? req.body.label.trim() : "";
      const description = typeof req.body.description === "string" ? req.body.description.trim() : "";

      if (!reportId || !rawUrl) {
        return res.status(400).json({ status: "error", message: "Report ID and evidence URL are required" });
      }
      if (rawUrl.length > 2048 || label.length > 255 || description.length > 1000) {
        return res.status(400).json({ status: "error", message: "The evidence link or description is too long" });
      }

      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return res.status(400).json({ status: "error", message: "Enter a valid HTTPS link" });
      }
      if (url.protocol !== "https:" || url.username || url.password) {
        return res.status(400).json({ status: "error", message: "Evidence links must use HTTPS and cannot contain embedded credentials" });
      }

      const reportResult = await pool.query(
        `SELECT id, reporter_id FROM reports WHERE id = $1`,
        [reportId]
      );
      if (reportResult.rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Report not found" });
      }

      const isOwner = reportResult.rows[0].reporter_id === req.user!.id;
      if (!isOwner) {
        return res.status(403).json({ status: "error", message: "You do not have permission to add evidence to this report" });
      }

      const result = await pool.query(
        `INSERT INTO evidence
           (report_id, uploaded_by, evidence_type, file_name, file_url, description)
         VALUES ($1, $2, 'LINK'::evidence_type, $3, $4, $5)
         RETURNING id, report_id, uploaded_by, evidence_type, file_name, file_url,
                   file_hash, description, verification_status, created_at, updated_at`,
        [reportId, req.user!.id, label || url.hostname, url.toString(), description || null]
      );

      return res.status(201).json({
        status: "ok",
        message: "Evidence link added successfully",
        evidence: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to add evidence link:", error);
      return res.status(500).json({ status: "error", message: "Failed to add evidence link" });
    }
  }
);

// Find the closest Wayback Machine capture and attach it to this report.
router.post(
  "/archive/check",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = typeof req.body.report_id === "string" ? req.body.report_id.trim() : "";
      const rawUrl = typeof req.body.url === "string" ? req.body.url.trim() : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId)) {
        return res.status(400).json({ status: "error", message: "A valid report ID is required" });
      }
      if (!rawUrl || rawUrl.length > 2048) {
        return res.status(400).json({ status: "error", message: "Enter a web page URL up to 2048 characters" });
      }

      let sourceUrl: URL;
      try {
        sourceUrl = new URL(rawUrl);
      } catch {
        return res.status(400).json({ status: "error", message: "Enter a valid HTTPS web page URL" });
      }
      if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) {
        return res.status(400).json({ status: "error", message: "The source link must use HTTPS and cannot contain embedded credentials" });
      }

      const reportResult = await pool.query(
        `SELECT id, reporter_id FROM reports WHERE id = $1`,
        [reportId]
      );
      if (reportResult.rows.length === 0) {
        return res.status(404).json({ status: "error", message: "Report not found" });
      }
      const isOwner = reportResult.rows[0].reporter_id === req.user!.id;
      if (!isOwner) {
        return res.status(403).json({ status: "error", message: "You do not have permission to add evidence to this report" });
      }

      const availabilityUrl = new URL("https://archive.org/wayback/available");
      availabilityUrl.searchParams.set("url", sourceUrl.toString());
      const archiveResponse = await fetch(availabilityUrl, {
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (!archiveResponse.ok) {
        return res.status(502).json({ status: "error", message: "The Internet Archive could not check this page right now. Try again later." });
      }

      const archiveData = await archiveResponse.json() as {
        archived_snapshots?: { closest?: { available?: boolean; url?: string; timestamp?: string } };
      };
      const closest = archiveData.archived_snapshots?.closest;
      if (!closest?.available || !closest.url) {
        return res.json({
          status: "ok",
          available: false,
          message: "No archived copy was found yet. Save the page with Internet Archive, then check again to attach the snapshot.",
        });
      }

      let archivedUrl: URL;
      try {
        archivedUrl = new URL(closest.url);
      } catch {
        return res.status(502).json({ status: "error", message: "The Internet Archive returned an invalid snapshot link" });
      }
      if (archivedUrl.hostname !== "web.archive.org" || !/^\/web\/\d{1,14}\//.test(archivedUrl.pathname)) {
        return res.status(502).json({ status: "error", message: "The Internet Archive returned an invalid snapshot link" });
      }
      archivedUrl.protocol = "https:";

      const existing = await pool.query(
        `SELECT id, report_id, uploaded_by, evidence_type, file_name, file_url,
                file_hash, description, verification_status, created_at, updated_at
         FROM evidence WHERE report_id = $1 AND file_url = $2 LIMIT 1`,
        [reportId, archivedUrl.toString()]
      );
      if (existing.rows.length > 0) {
        return res.json({
          status: "ok",
          available: true,
          already_attached: true,
          archived_url: archivedUrl.toString(),
          evidence: existing.rows[0],
          message: "This archived copy is already attached to the report.",
        });
      }

      const result = await pool.query(
        `INSERT INTO evidence
           (report_id, uploaded_by, evidence_type, file_name, file_url, description)
         VALUES ($1, $2, 'LINK'::evidence_type, 'Internet Archive snapshot', $3, $4)
         RETURNING id, report_id, uploaded_by, evidence_type, file_name, file_url,
                   file_hash, description, verification_status, created_at, updated_at`,
        [reportId, req.user!.id, archivedUrl.toString(), `Archived copy of ${sourceUrl.hostname}${closest.timestamp ? ` · ${closest.timestamp}` : ""}`]
      );

      return res.status(201).json({
        status: "ok",
        available: true,
        already_attached: false,
        archived_url: archivedUrl.toString(),
        evidence: result.rows[0],
        message: "Archived copy found and attached to the report.",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return res.status(504).json({ status: "error", message: "The Internet Archive check timed out. Try again." });
      }
      console.error("Failed to check Internet Archive snapshot:", error);
      return res.status(502).json({ status: "error", message: "Failed to check for an archived copy" });
    }
  }
);

// Upload evidence file
router.post(
  "/upload",
  authenticate,
  handleEvidenceUpload,
  async (req: AuthenticatedRequest, res) => {
    let cloudinaryPublicId: string | null = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Evidence file is required",
        });
      }

      if (!hasMatchingFileSignature(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
          status: "error",
          message: "File contents do not match the declared file type",
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
      if (!isOwner) {
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
        "application/pdf": "DOCUMENT",
      };

      const evidenceType = evidenceTypeMap[req.file.mimetype];

      if (!evidenceType) {
        return res.status(400).json({
          status: "error",
          message: "Unsupported evidence type",
        });
      }

      // Reject oversize files here, before spending an upload on them
      const maxBytes = maxBytesForMime(req.file.mimetype);

      if (req.file.size > maxBytes) {
        return res.status(400).json({
          status: "error",
          message: `${evidenceType === "IMAGE" ? "Images" : "PDFs"} can be at most ${formatLimit(maxBytes)}`,
        });
      }

      const uploadedBytes = await pool.query(
        `SELECT COALESCE(SUM(file_size_bytes), 0)::bigint AS used_bytes
         FROM evidence
         WHERE report_id = $1
           AND evidence_type IN ('IMAGE'::evidence_type, 'DOCUMENT'::evidence_type)
           AND file_url IS NOT NULL`,
        [report_id]
      );
      const usedBytes = Number(uploadedBytes.rows[0]?.used_bytes ?? 0);
      const remainingBytes = Math.max(0, maxBytes - usedBytes);

      if (req.file.size > remainingBytes) {
        return res.status(400).json({
          status: "error",
          message: `All files uploaded directly to Shabdhan may total 12 MB per report. ${formatLimit(remainingBytes)} remaining.`,
        });
      }

      const fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      const resourceType =
        req.file.mimetype === "application/pdf"
          ? "raw"
          : "image";

      // Captured here because TypeScript loses the earlier req.file check
      // inside the callback below
      const fileBuffer = req.file.buffer;

      let uploadResult: { secure_url: string; public_id: string };

      try {
        uploadResult = await new Promise<{
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

          uploadStream.end(fileBuffer);
        });
      } catch (storageError: any) {
        // Cloudinary refused the file (plan limit, corrupt file, ...):
        // tell the user why instead of a generic 500
        console.error("Cloudinary upload failed:", storageError);

        return res.status(502).json({
          status: "error",
          message: `File storage rejected the upload${
            storageError?.message ? `: ${storageError.message}` : ""
          }`,
        });
      }

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
           file_size_bytes,
           cloudinary_public_id,
           description
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
           id,
           report_id,
           uploaded_by,
           evidence_type,
           file_name,
           file_url,
           file_hash,
           file_size_bytes,
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
          req.file.size,
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

// Delete evidence uploaded to a report when the user owns it or can moderate it.
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const result = await withTransaction(async (client) => {
        const selected = await client.query(
          `SELECT e.id, e.report_id, e.uploaded_by, e.evidence_type,
                  e.file_name, e.file_url, e.cloudinary_public_id,
                  r.reporter_id
           FROM evidence e
           JOIN reports r ON r.id = e.report_id
           WHERE e.id = $1
           FOR UPDATE OF e`,
          [id]
        );
        const evidence = selected.rows[0];

        if (!evidence) return { notFound: true as const };

        const canDelete =
          evidence.reporter_id === req.user!.id ||
          req.user!.role === "ADMIN";

        if (!canDelete) return { forbidden: true as const };

        if (evidence.cloudinary_public_id) {
          const resourceType =
            evidence.evidence_type === "VIDEO"
              ? "video"
              : evidence.evidence_type === "DOCUMENT"
                ? "raw"
                : "image";
          const removal = await cloudinary.uploader.destroy(
            evidence.cloudinary_public_id,
            { resource_type: resourceType, invalidate: true }
          );

          if (removal.result !== "ok" && removal.result !== "not found") {
            throw new Error("Cloudinary did not confirm evidence removal");
          }
        }

        await client.query(`DELETE FROM evidence WHERE id = $1`, [id]);
        await createAuditLog({
          userId: req.user!.id,
          action: "EVIDENCE_DELETED",
          entityType: "evidence",
          entityId: id,
          oldData: {
            report_id: evidence.report_id,
            evidence_type: evidence.evidence_type,
            file_name: evidence.file_name,
            file_url: evidence.file_url,
          },
          newData: { deleted: true },
          req,
          client,
        });

        return { deleted: true as const };
      });

      if ("notFound" in result) {
        return res.status(404).json({ status: "error", message: "Evidence not found" });
      }
      if ("forbidden" in result) {
        return res.status(403).json({ status: "error", message: "You do not have permission to delete this evidence" });
      }

      return res.json({ status: "ok", message: "Evidence deleted" });
    } catch (error) {
      console.error("Failed to delete evidence:", error);
      return res.status(500).json({ status: "error", message: "Failed to delete evidence" });
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

      const updated = await withTransaction(async (client) => {
        // Lock the row so the audit entry records the true previous value
        const current = await client.query(
          `SELECT verification_status FROM evidence WHERE id = $1 FOR UPDATE`,
          [id]
        );

        const result = await client.query(
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
            verification_status:
              current.rows[0]?.verification_status ?? oldVerificationStatus,
          },
          newData: {
            verification_status,
          },
          req,
          client,
        });

        return result;
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
  optionalAuthenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const report = await pool.query(
        `SELECT id
         FROM reports r
         WHERE r.id = $1
           AND (
             (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          req.params.reportId,
          req.user?.id ?? null,
          req.user
            ? ["MODERATOR", "ADMIN"].includes(req.user.role)
            : false,
        ]
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
           e.file_size_bytes,
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
router.get(
  "/:id",
  optionalAuthenticate,
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
         json_build_object(
           'id', u.id,
           'username', u.username
         ) AS uploader
       FROM evidence e
       JOIN users u ON u.id = e.uploaded_by
       JOIN reports r ON r.id = e.report_id
       WHERE e.id = $1
         AND (
           (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
           OR r.reporter_id = $2
           OR $3 = TRUE
         )`,
      [
        req.params.id,
        req.user?.id ?? null,
        req.user
          ? ["MODERATOR", "ADMIN"].includes(req.user.role)
          : false,
      ]
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
