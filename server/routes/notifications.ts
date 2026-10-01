import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get current user's notifications
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           id,
           user_id,
           type,
           title,
           message,
           entity_type,
           entity_id,
           is_read,
           created_at,
           read_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC`,
        [req.user!.id]
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        notifications: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch notifications",
      });
    }
  }
);

// Get current user's unread notification count
router.get(
  "/unread-count",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) AS unread_count
         FROM notifications
         WHERE user_id = $1
           AND is_read = FALSE`,
        [req.user!.id]
      );

      res.json({
        status: "ok",
        unread_count: Number(result.rows[0].unread_count),
      });
    } catch (error) {
      console.error("Failed to fetch unread notification count:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch unread notification count",
      });
    }
  }
);

// Mark one notification as read
router.patch(
  "/:id/read",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `UPDATE notifications
         SET
           is_read = TRUE,
           read_at = NOW()
         WHERE id = $1
           AND user_id = $2
         RETURNING
           id,
           user_id,
           type,
           title,
           message,
           entity_type,
           entity_id,
           is_read,
           created_at,
           read_at`,
        [req.params.id, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Notification not found",
        });
      }

      res.json({
        status: "ok",
        message: "Notification marked as read",
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to mark notification as read",
      });
    }
  }
);

// Mark all current user's notifications as read
router.patch(
  "/read-all",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `UPDATE notifications
         SET
           is_read = TRUE,
           read_at = NOW()
         WHERE user_id = $1
           AND is_read = FALSE`,
        [req.user!.id]
      );

      res.json({
        status: "ok",
        message: "All notifications marked as read",
        updated_count: result.rowCount ?? 0,
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to mark all notifications as read",
      });
    }
  }
);

export default router;
