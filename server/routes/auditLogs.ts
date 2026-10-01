import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";

const router = Router();

// Get audit logs (Moderator/Admin)
router.get(
  "/",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        action,
        entity_type,
        entity_id,
        user_id,
      } = req.query;

      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        100
      );
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: string[] = [];

      if (action) {
        values.push(String(action));
        conditions.push(`a.action = $${values.length}`);
      }

      if (entity_type) {
        values.push(String(entity_type));
        conditions.push(`a.entity_type = $${values.length}`);
      }

      if (entity_id) {
        values.push(String(entity_id));
        conditions.push(`a.entity_id = $${values.length}`);
      }

      if (user_id) {
        values.push(String(user_id));
        conditions.push(`a.user_id = $${values.length}`);
      }

      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(" AND ")}`
          : "";

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM audit_logs a
         ${whereClause}`,
        values
      );

      const total = countResult.rows[0].total;

      const result = await pool.query(
        `SELECT
           a.id,
           a.user_id,
           u.username,
           a.action,
           a.entity_type,
           a.entity_id,
           a.old_data,
           a.new_data,
           a.ip_address,
           a.user_agent,
           a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         ${whereClause}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT $${values.length + 1}
         OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      res.json({
        status: "ok",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        count: result.rows.length,
        audit_logs: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch audit logs",
      });
    }
  }
);

export default router;
