import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import { createNotification } from "../utils/notifications";

const router = Router();

// Create a report
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { social_account_id, category_id, title, description } = req.body;

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

      if (category_id) {
        const category = await pool.query(
          `SELECT id FROM categories WHERE id = $1 AND is_active = true`,
          [category_id]
        );

        if (category.rows.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "Category not found",
          });
        }
      }

      // reporter_id comes from the authenticated user
      const result = await pool.query(
        `INSERT INTO reports
         (reporter_id, social_account_id, category_id, title, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, reporter_id, social_account_id, category_id,
                   title, description, status,
                   verification_status, published_at,
                   created_at, updated_at`,
        [
          req.user!.id,
          social_account_id,
          category_id || null,
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

// List reports for the authenticated user.
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const offset = (page - 1) * limit;
      const search = String(req.query.search || "").trim();
      const status = String(req.query.status || "").trim();

      const values: unknown[] = [req.user!.id];
      const conditions = ["r.reporter_id = $1"];

      if (search) {
        values.push(`%${search}%`);
        conditions.push(
          `(r.title ILIKE ${values.length} OR r.description ILIKE ${values.length})`
        );
      }

      if (status) {
        values.push(status);
        conditions.push(`r.status::text = ${values.length}`);
      }

      const where = conditions.join(" AND ");

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM reports r
         WHERE ${where}`,
        values
      );

      values.push(limit, offset);

      const result = await pool.query(
        `SELECT
           r.id,
           r.reporter_id,
           r.social_account_id,
           r.category_id,
           r.title,
           r.description,
           r.status,
           r.verification_status,
           r.published_at,
           r.created_at,
           r.updated_at,
           json_build_object(
             'id', sa.id,
             'platform', sa.platform,
             'username', sa.username,
             'profile_url', sa.profile_url,
             'display_name', sa.display_name,
             'account_id', sa.account_id
           ) AS social_account,
           CASE
             WHEN c.id IS NULL THEN NULL
             ELSE json_build_object(
               'id', c.id,
               'name', c.name,
               'description', c.description
             )
           END AS category
         FROM reports r
         JOIN social_accounts sa ON sa.id = r.social_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE ${where}
         ORDER BY r.created_at DESC
         LIMIT ${values.length - 1}
         OFFSET ${values.length}`,
        values
      );

      return res.json({
        status: "ok",
        reports: result.rows,
        pagination: {
          page,
          limit,
          total: countResult.rows[0].count,
          total_pages: Math.ceil(countResult.rows[0].count / limit),
        },
      });
    } catch (error) {
      console.error("Failed to fetch reports:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch reports",
      });
    }
  }
);

router.get("/:id", async (req, res) => {
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
           'username', u.username,
           'email', u.email,
           'role', u.role,
           'is_verified', u.is_verified
         ) AS reporter,
         json_build_object(
           'id', sa.id,
           'platform', sa.platform,
           'username', sa.username,
           'profile_url', sa.profile_url,
           'display_name', sa.display_name,
           'account_id', sa.account_id
         ) AS social_account,
         CASE
           WHEN c.id IS NULL THEN NULL
           ELSE json_build_object(
             'id', c.id,
             'name', c.name,
             'description', c.description
           )
         END AS category
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       JOIN social_accounts sa ON sa.id = r.social_account_id
       LEFT JOIN categories c ON c.id = r.category_id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }

    res.json({
      status: "ok",
      report: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch report:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch report",
    });
  }
});

// Get complete moderation details for a report
router.get(
  "/:id/moderation",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);

      const reportResult = await pool.query(
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
             'username', u.username,
             'email', u.email,
             'role', u.role,
             'is_verified', u.is_verified
           ) AS reporter,
           json_build_object(
             'id', sa.id,
             'platform', sa.platform,
             'username', sa.username,
             'profile_url', sa.profile_url,
             'display_name', sa.display_name,
             'account_id', sa.account_id
           ) AS social_account
         FROM reports r
         JOIN users u ON u.id = r.reporter_id
         JOIN social_accounts sa ON sa.id = r.social_account_id
         WHERE r.id = $1`,
        [id]
      );

      if (reportResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      const evidenceResult = await pool.query(
        `SELECT
           e.id,
           e.evidence_type,
           e.file_name,
           e.file_url,
           e.file_hash,
           e.description,
           e.verification_status,
           e.created_at,
           e.updated_at,
           json_build_object(
             'id', u.id,
             'username', u.username,
             'role', u.role
           ) AS uploaded_by
         FROM evidence e
         JOIN users u ON u.id = e.uploaded_by
         WHERE e.report_id = $1
         ORDER BY e.created_at DESC, e.id DESC`,
        [id]
      );

      const corroborationResult = await pool.query(
        `SELECT
           c.id,
           c.comment,
           c.created_at,
           json_build_object(
             'id', u.id,
             'username', u.username,
             'role', u.role
           ) AS user
         FROM corroborations c
         JOIN users u ON u.id = c.user_id
         WHERE c.report_id = $1
         ORDER BY c.created_at DESC, c.id DESC`,
        [id]
      );

      const disputeResult = await pool.query(
        `SELECT
           d.id,
           d.reason,
           d.result,
           d.review_notes,
           d.created_at,
           d.updated_at,
           json_build_object(
             'id', submitter.id,
             'username', submitter.username,
             'role', submitter.role
           ) AS submitted_by,
           CASE
             WHEN reviewer.id IS NULL THEN NULL
             ELSE json_build_object(
               'id', reviewer.id,
               'username', reviewer.username,
               'role', reviewer.role
             )
           END AS reviewed_by
         FROM disputes d
         JOIN users submitter ON submitter.id = d.submitted_by
         LEFT JOIN users reviewer ON reviewer.id = d.reviewed_by
         WHERE d.report_id = $1
         ORDER BY d.created_at DESC, d.id DESC`,
        [id]
      );

      const riskScoreResult = await pool.query(
        `SELECT
           id,
           score,
           explanation,
           calculated_at
         FROM risk_scores
         WHERE report_id = $1
         ORDER BY calculated_at DESC, id DESC
         LIMIT 1`,
        [id]
      );

      const auditLogResult = await pool.query(
  `SELECT
     a.id,
     a.action,
     a.entity_type,
     a.entity_id,
     a.old_data,
     a.new_data,
     a.created_at,
     json_build_object(
       'id', u.id,
       'username', u.username,
       'role', u.role
     ) AS user
   FROM audit_logs a
   LEFT JOIN users u ON u.id = a.user_id
   WHERE
     (a.entity_type = 'report' AND a.entity_id = $1)
     OR
     (
       a.entity_type = 'evidence'
       AND EXISTS (
         SELECT 1
         FROM evidence e
         WHERE e.id = a.entity_id
           AND e.report_id = $1
       )
     )
     OR
     (
       a.entity_type = 'dispute'
       AND EXISTS (
         SELECT 1
         FROM disputes d
         WHERE d.id = a.entity_id
           AND d.report_id = $1
       )
     )
   ORDER BY a.created_at DESC, a.id DESC
   LIMIT 100`,
  [id]
);

      return res.json({
        status: "ok",
        moderation: {
          report: reportResult.rows[0],
          evidence: evidenceResult.rows,
          corroborations: corroborationResult.rows,
          disputes: disputeResult.rows,
          risk_score: riskScoreResult.rows[0] || null,
          audit_logs: auditLogResult.rows,
        },
      });
    } catch (error) {
      console.error("Failed to fetch moderation details:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch moderation details",
      });
    }
  }
);

// Get all reports
router.get("/", async (req, res) => {
  try {
    const { status, verification_status, social_account_id, search } =
      req.query;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: string[] = [];

    if (status) {
      values.push(String(status));
      conditions.push(`r.status = $${values.length}`);
    }

    if (verification_status) {
      values.push(String(verification_status));
      conditions.push(`r.verification_status = $${values.length}`);
    }

    if (social_account_id) {
      values.push(String(social_account_id));
      conditions.push(`r.social_account_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${String(search)}%`);
      conditions.push(`
        (
          r.title ILIKE $${values.length}
          OR r.description ILIKE $${values.length}
          OR u.username ILIKE $${values.length}
          OR sa.username ILIKE $${values.length}
          OR sa.display_name ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       JOIN social_accounts sa ON sa.id = r.social_account_id
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

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
       ${whereClause}
       ORDER BY r.created_at DESC, r.id DESC
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
// Verify or reject a report
router.patch(
  "/:id/verify",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { verification_status } = req.body;

      const allowedStatuses = ["PENDING", "VERIFIED", "REJECTED"];

      if (
        !verification_status ||
        !allowedStatuses.includes(verification_status)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "verification_status must be one of: PENDING, VERIFIED, REJECTED",
        });
      }

      const report = await pool.query(
        `SELECT id, verification_status
         FROM reports
         WHERE id = $1`,
        [id]
      );

      if (report.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      const oldVerificationStatus = report.rows[0].verification_status;

      const updated = await pool.query(
        `UPDATE reports
         SET
           verification_status = $1,
           updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           reporter_id,
           social_account_id,
           title,
           description,
           status,
           verification_status,
           published_at,
           created_at,
           updated_at`,
        [verification_status, id]
      );

      await createAuditLog({
        userId: req.user!.id,
        action: "REPORT_VERIFICATION_UPDATED",
        entityType: "report",
        entityId: id,
        oldData: {
          verification_status: oldVerificationStatus,
        },
        newData: {
          verification_status,
        },
        req,
      });

if (oldVerificationStatus !== verification_status) {
  try {
    const reportDetails = await pool.query(
      `SELECT
         reporter_id,
         title
       FROM reports
       WHERE id = $1`,
      [id]
    );

    if (reportDetails.rows.length > 0) {
      const { reporter_id, title } = reportDetails.rows[0];

      await createNotification({
        userId: reporter_id,
        type:
          verification_status === "VERIFIED"
            ? "REPORT_VERIFIED"
            : verification_status === "REJECTED"
              ? "REPORT_REJECTED"
              : "REPORT_STATUS_UPDATED",
        title:
          verification_status === "VERIFIED"
            ? "Report verified"
            : verification_status === "REJECTED"
              ? "Report rejected"
              : "Report status updated",
        message: `Your report "${title}" is now ${verification_status.toLowerCase()}.`,
        entityType: "report",
        entityId: id,
      });
    }
  } catch (notificationError) {
    console.error(
      "Failed to create report notification:",
      notificationError
    );
  }
}

      return res.json({
        status: "ok",
        message: "Report verification status updated successfully",
        report: updated.rows[0],
      });
    } catch (error) {
      console.error("Failed to verify report:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to update report verification status",
      });
    }
  }
);

export default router;
