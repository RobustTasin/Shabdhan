import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  optionalAuthenticate,
  AuthenticatedRequest,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import { createNotification } from "../utils/notifications";
import { withTransaction } from "../utils/transaction";

const router = Router();

// Create a comment or reply
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        report_id,
        parent_comment_id,
        content,
      } = req.body;

      if (!report_id || !content?.trim()) {
        return res.status(400).json({
          status: "error",
          message: "Report ID and comment content are required",
        });
      }

      // Make sure the report exists
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

      // If this is a reply, make sure the parent comment belongs
      // to the same report.
      let parentAuthorId: string | null = null;

      if (parent_comment_id) {
        const parentComment = await pool.query(
          `SELECT id, user_id
           FROM comments
           WHERE id = $1
             AND report_id = $2`,
          [parent_comment_id, report_id]
        );

        if (parentComment.rows.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "Parent comment not found for this report",
          });
        }

        parentAuthorId = parentComment.rows[0].user_id;
      }

      const result = await pool.query(
        `INSERT INTO comments
         (
           report_id,
           user_id,
           parent_comment_id,
           content
         )
         VALUES ($1, $2, $3, $4)
         RETURNING
           id,
           report_id,
           user_id,
           parent_comment_id,
           content,
           created_at,
           updated_at`,
        [
          report_id,
          req.user!.id,
          parent_comment_id || null,
          content.trim(),
        ]
      );

      // Notify the people involved (never the commenter themselves). A
      // failure here must not undo the comment.
      try {
        const actorId = req.user!.id;
        const { reporter_id: ownerId, title } = report.rows[0];

        if (parentAuthorId && parentAuthorId !== actorId) {
          await createNotification({
            userId: parentAuthorId,
            type: "REPORT_COMMENT_REPLY",
            title: "New reply to your comment",
            message: `${req.user!.username} replied to your comment on "${title}".`,
            entityType: "report",
            entityId: report_id,
          });
        }

        // The owner already got the reply notice above if they wrote the
        // parent comment
        if (ownerId !== actorId && ownerId !== parentAuthorId) {
          await createNotification({
            userId: ownerId,
            type: "REPORT_COMMENTED",
            title: "New comment on your report",
            message: `${req.user!.username} commented on your report "${title}".`,
            entityType: "report",
            entityId: report_id,
          });
        }
      } catch (notificationError) {
        console.error(
          "Failed to create comment notification:",
          notificationError
        );
      }

      return res.status(201).json({
        status: "ok",
        message: "Comment created successfully",
        comment: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to create comment:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to create comment",
      });
    }
  }
);

// Get all comments for a report
router.get(
  "/report/:reportId",
  optionalAuthenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = String(req.params.reportId);

      const accessibleReport = await pool.query(
        `SELECT id
         FROM reports r
         WHERE r.id = $1
           AND (
             (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          reportId,
          req.user?.id ?? null,
          ["MODERATOR", "ADMIN"].includes(req.user?.role ?? ""),
        ]
      );

      if (accessibleReport.rows.length === 0) {
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
           u.username,
           c.parent_comment_id,
           c.content,
           c.created_at,
           c.updated_at
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.report_id = $1
         ORDER BY c.created_at ASC, c.id ASC`,
        [reportId]
      );

      return res.json({
        status: "ok",
        count: result.rows.length,
        comments: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch comments:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch comments",
      });
    }
  }
);

// Update a comment
router.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({
          status: "error",
          message: "Comment content is required",
        });
      }

      const existing = await pool.query(
        `SELECT c.id, c.user_id
         FROM comments c
         JOIN reports r ON r.id = c.report_id
         WHERE c.id = $1
           AND (
             (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          id,
          req.user!.id,
          ["MODERATOR", "ADMIN"].includes(req.user!.role),
        ]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Comment not found",
        });
      }

      const isOwner = existing.rows[0].user_id === req.user!.id;
      const isModeratorOrAdmin = ["MODERATOR", "ADMIN"].includes(
        req.user!.role
      );

      if (!isOwner && !isModeratorOrAdmin) {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to edit this comment",
        });
      }

      const result = await pool.query(
        `UPDATE comments
         SET
           content = $1,
           updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           report_id,
           user_id,
           parent_comment_id,
           content,
           created_at,
           updated_at`,
        [content.trim(), id]
      );

      return res.json({
        status: "ok",
        message: "Comment updated successfully",
        comment: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to update comment:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to update comment",
      });
    }
  }
);
// Delete a comment
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);

      const outcome = await withTransaction(async (client) => {
        const existing = await client.query(
          `SELECT id, report_id, user_id, parent_comment_id, content
           FROM comments
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );

        if (existing.rows.length === 0) {
          return { kind: "not_found" as const };
        }

        const comment = existing.rows[0];

        const isOwner = comment.user_id === req.user!.id;
        const isModeratorOrAdmin = ["MODERATOR", "ADMIN"].includes(
          req.user!.role
        );

        const accessibleReport = await client.query(
          `SELECT id
           FROM reports r
           WHERE r.id = $1
             AND (
               (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
               OR r.reporter_id = $2
               OR $3 = TRUE
             )`,
          [
            comment.report_id,
            req.user!.id,
            ["MODERATOR", "ADMIN"].includes(req.user!.role),
          ]
        );

        if (accessibleReport.rows.length === 0) {
          return { kind: "not_found" as const };
        }

        if (!isOwner && !isModeratorOrAdmin) {
          return { kind: "forbidden" as const };
        }

        // Deleting a comment also deletes every reply under it (ON DELETE
        // CASCADE), so count them for the record
        const replies = await client.query(
          `WITH RECURSIVE thread AS (
             SELECT id FROM comments WHERE parent_comment_id = $1
             UNION ALL
             SELECT c.id FROM comments c
             JOIN thread t ON c.parent_comment_id = t.id
           )
           SELECT COUNT(*)::int AS count FROM thread`,
          [id]
        );

        await client.query(
          `DELETE FROM comments
           WHERE id = $1`,
          [id]
        );

        // Removing someone else's comment is a moderation action: keep a
        // record of what was removed and who removed it
        if (!isOwner) {
          await createAuditLog({
            userId: req.user!.id,
            action: "COMMENT_REMOVED_BY_MODERATOR",
            entityType: "comment",
            entityId: id,
            oldData: {
              report_id: comment.report_id,
              author_id: comment.user_id,
              parent_comment_id: comment.parent_comment_id,
              content: comment.content,
              replies_removed: replies.rows[0].count,
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
          message: "Comment not found",
        });
      }

      if (outcome.kind === "forbidden") {
        return res.status(403).json({
          status: "error",
          message: "You do not have permission to delete this comment",
        });
      }

      return res.json({
        status: "ok",
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete comment:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to delete comment",
      });
    }
  }
);
// Get one comment
router.get(
  "/:id",
  optionalAuthenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);

      const result = await pool.query(
        `SELECT
           c.id,
           c.report_id,
           c.user_id,
           u.username,
           c.parent_comment_id,
           c.content,
           c.created_at,
           c.updated_at
         FROM comments c
         JOIN users u ON u.id = c.user_id
         JOIN reports r ON r.id = c.report_id
         WHERE c.id = $1
           AND (
             (r.status = 'PUBLISHED' AND r.verification_status = 'VERIFIED')
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          id,
          req.user?.id ?? null,
          ["MODERATOR", "ADMIN"].includes(req.user?.role ?? ""),
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Comment not found",
        });
      }

      return res.json({
        status: "ok",
        comment: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch comment:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch comment",
      });
    }
  }
);

export default router;
