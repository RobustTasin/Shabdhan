import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";

const router = Router();

// Get all users
router.get(
  "/",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at
         FROM users
         ORDER BY created_at DESC`
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        users: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch users",
      });
    }
  }
);

// Get one user
router.get(
  "/:id",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at
         FROM users
         WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "ok",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch user",
      });
    }
  }
);

// Update basic user information
router.patch(
  "/:id",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { username, email } = req.body;

      if (!username || !email) {
        return res.status(400).json({
          status: "error",
          message: "Username and email are required",
        });
      }

      const existing = await pool.query(
        `SELECT id
         FROM users
         WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const duplicate = await pool.query(
        `SELECT id
         FROM users
         WHERE (username = $1 OR email = $2)
           AND id <> $3`,
        [username, email, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Username or email already exists",
        });
      }

      const result = await pool.query(
        `UPDATE users
         SET
           username = $1,
           email = $2,
           updated_at = NOW()
         WHERE id = $3
         RETURNING
           id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at`,
        [username, email, id]
      );

      res.json({
        status: "ok",
        message: "User updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to update user:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update user",
      });
    }
  }
);

// Update user role
router.patch(
  "/:id/role",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { role } = req.body;

      const allowedRoles = [
        "USER",
        "MODERATOR",
        "ADMIN",
        "ENTITY_OWNER",
      ];

      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({
          status: "error",
          message:
            "Role must be USER, MODERATOR, ADMIN, or ENTITY_OWNER",
        });
      }

      const result = await pool.query(
        `UPDATE users
         SET role = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at`,
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "ok",
        message: "User role updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to update user role:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update user role",
      });
    }
  }
);

// Update user active status
router.patch(
  "/:id/status",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { is_active } = req.body;

      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          status: "error",
          message: "is_active must be a boolean",
        });
      }

      const result = await pool.query(
        `UPDATE users
         SET is_active = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at`,
        [is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "ok",
        message: "User status updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to update user status:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update user status",
      });
    }
  }
);

export default router;