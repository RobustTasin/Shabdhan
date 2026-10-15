import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  optionalAuthenticate,
  AuthenticatedRequest,
} from "../middleware/auth";
import { createNotification } from "../utils/notifications";
import { createAuditLog } from "../utils/audit";
import { withTransaction } from "../utils/transaction";

const router = Router();

// Create a corroboration
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { report_id, comment } = req.body;

    if (!report_id) {
      return res.status(400).json({
        status: "error",
        message: "Report ID is required",
      });
    }

    const report = await pool.query(
      `SELECT id, reporter_id, title
       FROM reports r
       WHERE r.id = $1
         AND (
           (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
           OR r.reporter_id = $2
           OR $3 = TRUE
         )`,
      [
        report_id,
        req.user!.id,
        ["MODERATOR", "ADMIN"].includes(req.user!.role),
      ]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }

    // A reporter backing their own report would inflate its credibility
    if (report.rows[0].reporter_id === req.user!.id) {
      return res.status(403).json({
        status: "error",
        message: "You cannot corroborate your own report",
      });
    }

    const result = await pool.query(
      `INSERT INTO corroborations (report_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, report_id, user_id, comment, created_at`,
      [report_id, req.user!.id, comment || null]
    );

    // Let the report owner know (a failure here must not undo the corroboration)
    try {
      await createNotification({
        userId: report.rows[0].reporter_id,
        type: "REPORT_CORROBORATED",
        title: "Your report was corroborated",
        message: `${req.user!.username} corroborated your report "${report.rows[0].title}".`,
        entityType: "report",
        entityId: report_id,
      });
    } catch (notificationError) {
      console.error(
        "Failed to create corroboration notification:",
        notificationError
      );
    }

    res.status(201).json({
      status: "ok",
      message: "Corroboration added successfully",
      corroboration: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "You have already corroborated this report",
      });
    }

    console.error("Failed to create corroboration:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to create corroboration",
    });
  }
});

// Get all corroborations for a report
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
          ["MODERATOR", "ADMIN"].includes(req.user?.role ?? ""),
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
           c.id,
           c.report_id,
           c.user_id,
           c.comment,
           c.created_at,
           json_build_object(
             'id', u.id,
             'username', u.username,
             'is_verified', u.is_verified
           ) AS user
         FROM corroborations c
         JOIN users u ON u.id = c.user_id
         WHERE c.report_id = $1
         ORDER BY c.created_at DESC`,
        [req.params.reportId]
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        corroborations: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch corroborations:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch corroborations",
      });
    }
  }
);

// Get one corroboration
router.get(
  "/:id",
  optionalAuthenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           c.id,
           c.report_id,
           c.user_id,
           c.comment,
           c.created_at,
           json_build_object(
             'id', u.id,
             'username', u.username,
             'is_verified', u.is_verified
           ) AS user
         FROM corroborations c
         JOIN users u ON u.id = c.user_id
         JOIN reports r ON r.id = c.report_id
         WHERE c.id = $1
           AND (
             (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          req.params.id,
          req.user?.id ?? null,
          ["MODERATOR", "ADMIN"].includes(req.user?.role ?? ""),
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Corroboration not found",
        });
      }

      res.json({
        status: "ok",
        corroboration: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch corroboration:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch corroboration",
      });
    }
  }
);

// Delete your own corroboration or moderate another user's corroboration
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const isModeratorOrAdmin = ["MODERATOR", "ADMIN"].includes(
      req.user!.role
    );

    const outcome = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id, report_id, user_id, comment, created_at
         FROM corroborations
         WHERE id = $1
         FOR UPDATE`,
        [req.params.id]
      );

      if (existing.rows.length === 0) {
        return { kind: "not_found" as const };
      }

      const corroboration = existing.rows[0];
      const isOwner = corroboration.user_id === userId;

      const accessibleReport = await client.query(
        `SELECT id
         FROM reports r
         WHERE r.id = $1
           AND (
             (r.status = 'PUBLISHED'
               AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [corroboration.report_id, userId, isModeratorOrAdmin]
      );

      if (accessibleReport.rows.length === 0) {
        return { kind: "not_found" as const };
      }

      if (!isOwner && !isModeratorOrAdmin) {
        return { kind: "forbidden" as const };
      }

      await client.query(
        `DELETE FROM corroborations
         WHERE id = $1`,
        [corroboration.id]
      );

      if (!isOwner) {
        await createAuditLog({
          userId,
          action: "CORROBORATION_REMOVED_BY_MODERATOR",
          entityType: "corroboration",
          entityId: corroboration.id,
          oldData: {
            report_id: corroboration.report_id,
            author_id: corroboration.user_id,
            comment: corroboration.comment,
            created_at: corroboration.created_at,
          },
          req,
          client,
        });
      }

      return { kind: "ok" as const };
    });

    if (outcome.kind === "not_found") {
      return res.status(404).json({
        status: "error",
        message: "Corroboration not found",
      });
    }

    if (outcome.kind === "forbidden") {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this corroboration",
      });
    }

    return res.json({
      status: "ok",
      message: "Corroboration deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete corroboration:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to delete corroboration",
    });
  }
});

export default router;
