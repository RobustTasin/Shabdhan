import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Create a social account
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        platform,
        username,
        profile_url,
        display_name,
        account_id,
      } = req.body;

      if (!platform || !username) {
        return res.status(400).json({
          status: "error",
          message: "Platform and username are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO social_accounts
         (platform, username, profile_url, display_name, account_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, platform, username, profile_url,
                   display_name, account_id, created_at, updated_at`,
        [
          platform,
          username,
          profile_url || null,
          display_name || null,
          account_id || null,
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Social account created successfully",
        social_account: result.rows[0],
      });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "This social account already exists",
        });
      }

      console.error("Failed to create social account:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to create social account",
      });
    }
  }
);

// Get all social accounts
router.get(
  "/",
  authenticate,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT id, platform, username, profile_url,
                display_name, account_id, created_at, updated_at
         FROM social_accounts
         ORDER BY created_at DESC`
      );

      res.json({
        status: "ok",
        count: result.rows.length,
        social_accounts: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch social accounts:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch social accounts",
      });
    }
  }
);

// Get one social account
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT id, platform, username, profile_url,
                display_name, account_id, created_at, updated_at
         FROM social_accounts
         WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Social account not found",
        });
      }

      res.json({
        status: "ok",
        social_account: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch social account:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch social account",
      });
    }
  }
);

export default router;