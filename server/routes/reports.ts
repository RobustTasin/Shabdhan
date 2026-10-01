import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

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
