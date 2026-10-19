import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import { withTransaction } from "../utils/transaction";

const router = Router();

// Moderators may only manage ordinary accounts. Changing a moderator or an
// admin account needs the ADMIN role. Otherwise a moderator could rewrite an
// admin's email address and take the account over through password reset.
function canManageUser(actorRole: string, targetRole: string) {
  return (
    actorRole === "ADMIN" ||
    !["MODERATOR", "ADMIN"].includes(targetRole)
  );
}

const ADMIN_ONLY_MESSAGE =
  "Only admins can modify moderator or admin accounts";

const USER_COLUMNS = `id,
           username,
           email,
           role,
           is_active,
           is_verified,
           created_at,
           updated_at`;

// Public profile data is deliberately limited to the username, aggregate
// activity counts, and reports that are already visible in the public feed.
router.get("/:id/profile", async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, username FROM users WHERE id = $1 AND is_active = TRUE`,
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Profile not found" });
    }

    const [statsResult, reportsResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS reports,
           COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND verification_status = 'VERIFIED')::int AS published,
           COUNT(*) FILTER (WHERE status = 'REJECTED' OR verification_status = 'REJECTED')::int AS declined,
           (SELECT COUNT(*)::int FROM disputes d WHERE d.submitted_by = $1) AS disputes,
           (SELECT COUNT(*)::int
            FROM evidence e
            JOIN reports evidence_report ON evidence_report.id = e.report_id
            WHERE evidence_report.reporter_id = $1) AS evidences
         FROM reports
         WHERE reporter_id = $1`,
        [req.params.id]
      ),
      pool.query(
        `SELECT
           r.id, r.title, r.public_report_number, r.public_report_category_code,
           r.published_at, r.created_at,
           r.incident_type, r.incident_platform,
           c.name AS category_name,
           sa.platform, sa.username AS social_account_username
         FROM reports r
         LEFT JOIN social_accounts sa ON sa.id = r.social_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.reporter_id = $1
           AND r.status = 'PUBLISHED'
           AND r.verification_status = 'VERIFIED'
         ORDER BY COALESCE(r.published_at, r.created_at) DESC, r.id DESC`,
        [req.params.id]
      ),
    ]);

    return res.json({
      status: "ok",
      profile: {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        stats: statsResult.rows[0],
        reports: reportsResult.rows,
      },
    });
  } catch (error) {
    console.error("Failed to fetch public profile:", error);
    return res.status(500).json({ status: "error", message: "Failed to fetch profile" });
  }
});

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

      const outcome = await withTransaction(async (client) => {
        const existing = await client.query(
          `SELECT id, username, email, role
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );

        if (existing.rows.length === 0) {
          return { kind: "not_found" as const };
        }

        const target = existing.rows[0];

        if (!canManageUser(req.user!.role, target.role)) {
          return { kind: "forbidden" as const };
        }

        const duplicate = await client.query(
          `SELECT id
           FROM users
           WHERE (username = $1 OR email = $2)
             AND id <> $3`,
          [username, email, id]
        );

        if (duplicate.rows.length > 0) {
          return { kind: "duplicate" as const };
        }

        const result = await client.query(
          `UPDATE users
           SET
             username = $1,
             email = $2,
             updated_at = NOW()
           WHERE id = $3
           RETURNING ${USER_COLUMNS}`,
          [username, email, id]
        );

        await createAuditLog({
          userId: req.user!.id,
          action: "USER_PROFILE_UPDATED",
          entityType: "user",
          entityId: id,
          oldData: { username: target.username, email: target.email },
          newData: { username, email },
          req,
          client,
        });

        return { kind: "ok" as const, user: result.rows[0] };
      });

      if (outcome.kind === "not_found") {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (outcome.kind === "forbidden") {
        return res.status(403).json({
          status: "error",
          message: ADMIN_ONLY_MESSAGE,
        });
      }

      if (outcome.kind === "duplicate") {
        return res.status(409).json({
          status: "error",
          message: "Username or email already exists",
        });
      }

      res.json({
        status: "ok",
        message: "User updated successfully",
        user: outcome.user,
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

      // Prevents an admin from demoting themselves and leaving the
      // system without anyone who can manage roles
      if (id === req.user!.id && role !== req.user!.role) {
        return res.status(400).json({
          status: "error",
          message: "You cannot change your own role",
        });
      }

      const outcome = await withTransaction(async (client) => {
        const existing = await client.query(
          `SELECT id, role
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );

        if (existing.rows.length === 0) {
          return { kind: "not_found" as const };
        }

        const result = await client.query(
          `UPDATE users
           SET role = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING ${USER_COLUMNS}`,
          [role, id]
        );

        await createAuditLog({
          userId: req.user!.id,
          action: "USER_ROLE_UPDATED",
          entityType: "user",
          entityId: id,
          oldData: { role: existing.rows[0].role },
          newData: { role },
          req,
          client,
        });

        return { kind: "ok" as const, user: result.rows[0] };
      });

      if (outcome.kind === "not_found") {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "ok",
        message: "User role updated successfully",
        user: outcome.user,
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

      if (id === req.user!.id && !is_active) {
        return res.status(400).json({
          status: "error",
          message: "You cannot deactivate your own account",
        });
      }

      const outcome = await withTransaction(async (client) => {
        const existing = await client.query(
          `SELECT id, role, is_active
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );

        if (existing.rows.length === 0) {
          return { kind: "not_found" as const };
        }

        const target = existing.rows[0];

        if (!canManageUser(req.user!.role, target.role)) {
          return { kind: "forbidden" as const };
        }

        const result = await client.query(
          `UPDATE users
           SET is_active = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING ${USER_COLUMNS}`,
          [is_active, id]
        );

        await createAuditLog({
          userId: req.user!.id,
          action: "USER_STATUS_UPDATED",
          entityType: "user",
          entityId: id,
          oldData: { is_active: target.is_active },
          newData: { is_active },
          req,
          client,
        });

        return { kind: "ok" as const, user: result.rows[0] };
      });

      if (outcome.kind === "not_found") {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (outcome.kind === "forbidden") {
        return res.status(403).json({
          status: "error",
          message: ADMIN_ONLY_MESSAGE,
        });
      }

      res.json({
        status: "ok",
        message: "User status updated successfully",
        user: outcome.user,
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
