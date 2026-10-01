import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active, created_at, updated_at
       FROM categories
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found",
      });
    }

    res.json({
      status: "ok",
      category: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch category:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch category",
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active, created_at, updated_at
       FROM categories
       WHERE is_active = true
       ORDER BY name ASC`
    );

    res.json({
      status: "ok",
      count: result.rows.length,
      categories: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch categories",
    });
  }
});

export default router;
