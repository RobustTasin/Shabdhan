import { Router } from "express";
import { pool } from "../config/database";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

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
      `SELECT id FROM reports WHERE id = $1`,
      [report_id]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO corroborations (report_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, report_id, user_id, comment, created_at`,
      [report_id, req.user!.id, comment || null]
    );

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
router.get("/report/:reportId", async (req, res) => {
  try {
    const report = await pool.query(
      `SELECT id FROM reports WHERE id = $1`,
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
});

// Get one corroboration
router.get("/:id", async (req, res) => {
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
       WHERE c.id = $1`,
      [req.params.id]
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
});

// Delete your own corroboration
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM corroborations
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Corroboration not found or you are not the owner",
      });
    }

    res.json({
      status: "ok",
      message: "Corroboration deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete corroboration:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to delete corroboration",
    });
  }
});

export default router;
