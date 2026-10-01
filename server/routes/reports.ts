import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Create a report
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { social_account_id, title, description } = req.body;

      if (!social_account_id || !title || !description) {
        return res.status(400).json({
          status: "error",
          message: "Social account, title, and description are required",
        });
      }

      // Make sure the referenced social account exists
      const socialAccount = await pool.query(
        `SELECT id
         FROM social_accounts
         WHERE id = $1`,
        [social_account_id]
      );

      if (socialAccount.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Social account not found",
        });
      }

      // reporter_id comes from the authenticated user
      const result = await pool.query(
        `INSERT INTO reports
         (reporter_id, social_account_id, title, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, reporter_id, social_account_id,
                   title, description, status,
                   verification_status, published_at,
                   created_at, updated_at`,
        [
          req.user!.id,
          social_account_id,
          title,
          description,
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Report created successfully",
        report: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to create report:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to create report",
      });
    }
  }
);

// Get all reports
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.title,
         r.description,
         r.status,
         r.verification_status,
         r.published_at,
         r.created_at,
         r.updated_at,
         json_build_object(
           'id', u.id,
           'username', u.username
         ) AS reporter,
         json_build_object(
           'id', sa.id,
           'platform', sa.platform,
           'username', sa.username,
           'profile_url', sa.profile_url,
           'display_name', sa.display_name
         ) AS social_account
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       JOIN social_accounts sa ON sa.id = r.social_account_id
       ORDER BY r.created_at DESC`
    );

    res.json({
      status: "ok",
      count: result.rows.length,
      reports: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch reports:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch reports",
    });
  }
});

export default router;