import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

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

      // If this is a reply, make sure the parent comment belongs
      // to the same report.
      if (parent_comment_id) {
        const parentComment = await pool.query(
          `SELECT id
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
  async (req, res) => {
    try {
      const reportId = String(req.params.reportId);

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
        `SELECT id, user_id
         FROM comments
         WHERE id = $1`,
        [id]
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

      const existing = await pool.query(
        `SELECT id, user_id
         FROM comments
         WHERE id = $1`,
        [id]
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
          message: "You do not have permission to delete this comment",
        });
      }

      await pool.query(
        `DELETE FROM comments
         WHERE id = $1`,
        [id]
      );

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
  async (req, res) => {
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
         WHERE c.id = $1`,
        [id]
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
