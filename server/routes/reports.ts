import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticate,
  optionalAuthenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { createAuditLog } from "../utils/audit";
import { createNotification } from "../utils/notifications";
import { withTransaction } from "../utils/transaction";
import { cloudinary } from "../config/cloudinary";
import { categoryCodeFromName, parsePublicReportId } from "../../shared/report-id";

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

      let publicReportCategoryCode = "OTHER";
      if (category_id) {
        const category = await pool.query(
          `SELECT id, name FROM categories WHERE id = $1 AND is_active = true`,
          [category_id]
        );

        if (category.rows.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "Category not found",
          });
        }
        publicReportCategoryCode = categoryCodeFromName(category.rows[0].name);
      }

      // reporter_id comes from the authenticated user
      const result = await pool.query(
        `INSERT INTO reports
         (reporter_id, social_account_id, category_id, public_report_category_code, title, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, public_report_number, public_report_category_code,
                   reporter_id, social_account_id, category_id,
                   title, description, status,
                   verification_status, published_at,
                   created_at, updated_at`,
        [
          req.user!.id,
          social_account_id,
          category_id || null,
          publicReportCategoryCode,
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
        values.push("%" + search + "%");
        conditions.push(
          "(r.title ILIKE $" + values.length + " OR r.description ILIKE $" + values.length + ")"
        );
      }

      if (status) {
        values.push(status);
        conditions.push("r.status::text = $" + values.length);
      }

      const where = conditions.join(" AND ");
      const limitParam = values.length + 1;
      const offsetParam = values.length + 2;

      const countResult = await pool.query(
        "SELECT COUNT(*)::int AS count FROM reports r WHERE " + where,
        values
      );

      const listValues = [...values, limit, offset];

      const result = await pool.query(
        `SELECT
           r.id,
           r.public_report_number,
           r.public_report_category_code,
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
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        listValues
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


// Public report search
router.get("/search", optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const categoryId = String(req.query.category_id || "").trim();
    const platform = String(req.query.platform || "").trim();
    const socialAccountId = String(req.query.social_account_id || "").trim();

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      "r.status = 'PUBLISHED'",
      "r.verification_status = 'VERIFIED'",
    ];

    const values: unknown[] = [];

    if (search) {
      const reportId = parsePublicReportId(search);
      if (reportId) {
        if (reportId.type === "uuid") {
          values.push(reportId.uuid);
          conditions.push(`r.id = $${values.length}::uuid`);
        } else {
          values.push(reportId.categoryCode, reportId.serial);
          conditions.push(`r.public_report_category_code = $${values.length - 1} AND r.public_report_number = $${values.length}::bigint`);
        }
      } else {
        values.push(`%${search}%`);
        const searchParam = values.length;

        conditions.push(`
          (
            r.title ILIKE $${searchParam}
            OR r.description ILIKE $${searchParam}
            OR sa.username ILIKE $${searchParam}
            OR sa.display_name ILIKE $${searchParam}
          )
        `);
      }
    }

    if (categoryId) {
      values.push(categoryId);
      conditions.push(`r.category_id = $${values.length}`);
    }

    if (platform) {
      values.push(platform);
      conditions.push(`LOWER(sa.platform) = LOWER($${values.length})`);
    }

    if (socialAccountId) {
      values.push(socialAccountId);
      conditions.push(`r.social_account_id = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM reports r
       JOIN social_accounts sa ON sa.id = r.social_account_id
       LEFT JOIN categories c ON c.id = r.category_id
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const viewerParam = values.length + 1;
    const limitParam = values.length + 2;
    const offsetParam = values.length + 3;

    const result = await pool.query(
      `SELECT
         r.id,
         r.public_report_number,
         r.public_report_category_code,
         r.title,
         r.description,
         r.status,
         r.verification_status,
         r.published_at,
         r.created_at,
         r.updated_at,
         (SELECT COUNT(*)::int FROM report_votes rv WHERE rv.report_id = r.id AND rv.vote = 1) AS upvote_count,
         (SELECT COUNT(*)::int FROM report_votes rv WHERE rv.report_id = r.id AND rv.vote = -1) AS downvote_count,
         (SELECT rv.vote FROM report_votes rv WHERE rv.report_id = r.id AND rv.user_id = $${viewerParam}) AS current_user_vote,
         (SELECT e.file_url
          FROM evidence e
          WHERE e.report_id = r.id
            AND e.evidence_type = 'IMAGE'
            AND e.verification_status = 'VERIFIED'
            AND e.file_url IS NOT NULL
          ORDER BY e.created_at DESC, e.id DESC
          LIMIT 1) AS preview_image_url,
         json_build_object(
           'id', sa.id,
           'platform', sa.platform,
           'username', sa.username,
           'profile_url', sa.profile_url,
           'display_name', sa.display_name
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
       ${whereClause}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $${limitParam}
       OFFSET $${offsetParam}`,
      [...values, req.user?.id ?? null, limit, offset]
    );

    return res.json({
      status: "ok",
      reports: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to search reports:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to search reports",
    });
  }
});

// One vote per signed-in user and report. Sending null removes the user's vote.
router.put("/:id/vote", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const vote = req.body?.vote;
    if (vote !== null && vote !== 1 && vote !== -1) {
      return res.status(400).json({
        status: "error",
        message: "Vote must be 1, -1, or null",
      });
    }

    const report = await pool.query(
      `SELECT id FROM reports
       WHERE id = $1 AND status = 'PUBLISHED' AND verification_status = 'VERIFIED'`,
      [req.params.id]
    );
    if (report.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }

    if (vote === null) {
      await pool.query(
        `DELETE FROM report_votes WHERE report_id = $1 AND user_id = $2`,
        [req.params.id, req.user!.id]
      );
    } else {
      await pool.query(
        `INSERT INTO report_votes (report_id, user_id, vote)
         VALUES ($1, $2, $3)
         ON CONFLICT (report_id, user_id)
         DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW()`,
        [req.params.id, req.user!.id, vote]
      );
    }

    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM report_votes WHERE report_id = $1 AND vote = 1) AS upvote_count,
         (SELECT COUNT(*)::int FROM report_votes WHERE report_id = $1 AND vote = -1) AS downvote_count,
         (SELECT vote FROM report_votes WHERE report_id = $1 AND user_id = $2) AS vote`,
      [req.params.id, req.user!.id]
    );

    return res.json({ status: "ok", ...counts.rows[0] });
  } catch (error) {
    console.error("Failed to save report vote:", error);
    return res.status(500).json({ status: "error", message: "Failed to save report vote" });
  }
});

// Get all reports for moderators and administrators.
router.get(
  "/moderation",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: string[] = [];

      for (const key of ["status", "verification_status", "social_account_id"] as const) {
        const value = String(req.query[key] || "").trim();
        if (value) {
          values.push(value);
          conditions.push(`r.${key} = $${values.length}`);
        }
      }

      const search = String(req.query.search || "").trim();
      if (search) {
        values.push(`%${search}%`);
        const parameter = `$${values.length}`;
        conditions.push(
          `(r.title ILIKE ${parameter}
            OR r.description ILIKE ${parameter}
            OR u.username ILIKE ${parameter}
            OR sa.username ILIKE ${parameter}
            OR sa.display_name ILIKE ${parameter})`
        );
      }

      const whereClause = conditions.length
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
           r.id, r.reporter_id, r.social_account_id, r.category_id,
           r.public_report_number, r.public_report_category_code,
           r.title, r.description, r.status, r.verification_status,
           r.published_at, r.created_at, r.updated_at,
           json_build_object(
             'id', u.id, 'username', u.username
           ) AS reporter,
           json_build_object(
             'id', sa.id, 'platform', sa.platform, 'username', sa.username,
             'profile_url', sa.profile_url, 'display_name', sa.display_name,
             'account_id', sa.account_id
           ) AS social_account,
           CASE WHEN c.id IS NULL THEN NULL
             ELSE json_build_object(
               'id', c.id, 'name', c.name, 'description', c.description
             )
           END AS category
         FROM reports r
         JOIN users u ON u.id = r.reporter_id
         JOIN social_accounts sa ON sa.id = r.social_account_id
         LEFT JOIN categories c ON c.id = r.category_id
         ${whereClause}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT $${values.length + 1}
         OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      return res.json({
        status: "ok",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        count: result.rows.length,
        reports: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch moderation reports:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch moderation reports",
      });
    }
  }
);

// Public report details are available only for published and verified
// reports. Owners can view their own reports; moderators and admins
// can view reports for moderation purposes.
router.get(
  "/:id",
  optionalAuthenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT
           r.id,
         r.public_report_number,
         r.public_report_category_code,
           r.title,
           r.description,
           r.status,
           r.verification_status,
           r.published_at,
           r.created_at,
           r.updated_at,
           r.reporter_id,
           json_build_object(
             'id', u.id,
             'username', u.username,
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
         WHERE r.id = $1
           AND (
             (
               r.status = 'PUBLISHED'
               AND r.verification_status = 'VERIFIED'
             )
             OR r.reporter_id = $2
             OR $3 = TRUE
           )`,
        [
          req.params.id,
          req.user?.id ?? null,
          req.user
            ? ["MODERATOR", "ADMIN"].includes(req.user.role)
            : false,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }

      const report = { ...result.rows[0] };
      delete report.reporter_id;

      return res.json({
        status: "ok",
        report,
      });
    } catch (error) {
      console.error("Failed to fetch report:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch report",
      });
    }
  }
);

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

// Verify or reject a report
router.patch(
  "/:id/verify",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const { verification_status } = req.body;
      const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";

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
      if (reason.length > 1000) {
        return res.status(400).json({ status: "error", message: "Reason must be 1000 characters or fewer" });
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

      let oldVerificationStatus = report.rows[0].verification_status;

      const updated = await withTransaction(async (client) => {
        // Lock the row so the audit entry records the true previous value
        const current = await client.query(
          `SELECT status, verification_status FROM reports WHERE id = $1 FOR UPDATE`,
          [id]
        );

        oldVerificationStatus = current.rows[0]?.verification_status ?? oldVerificationStatus;

        const result = await client.query(
          `UPDATE reports
           SET
             verification_status = $1::verification_status,
             status = CASE
               WHEN $1::verification_status = 'VERIFIED'::verification_status
                 AND status <> 'RESOLVED'::report_status THEN 'PUBLISHED'::report_status
               WHEN $1::verification_status = 'REJECTED'::verification_status
                 THEN 'REJECTED'::report_status
               WHEN $1::verification_status = 'PENDING'::verification_status
                 AND status = 'PUBLISHED'::report_status THEN 'DRAFT'::report_status
               ELSE status
             END,
             published_at = CASE
               WHEN $1::verification_status = 'VERIFIED'::verification_status
                 AND status <> 'RESOLVED'::report_status THEN COALESCE(published_at, NOW())
               WHEN $1::verification_status <> 'VERIFIED'::verification_status
                 AND status = 'PUBLISHED'::report_status THEN NULL
               ELSE published_at
             END,
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
            status: current.rows[0]?.status,
            verification_status:
              current.rows[0]?.verification_status ?? oldVerificationStatus,
          },
          newData: {
            status: result.rows[0]?.status,
            verification_status,
            ...(verification_status === "REJECTED" && reason ? { reason } : {}),
          },
          req,
          client,
        });

        return result;
      });

      if (oldVerificationStatus !== verification_status) {
        try {
          const updatedReport = updated.rows[0];
          await createNotification({
            userId: updatedReport.reporter_id,
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
            message: `Your report "${updatedReport.title}" is now ${verification_status.toLowerCase()}.${verification_status === "REJECTED" && reason ? ` Reason: ${reason}` : ""}`,
            entityType: "report",
            entityId: id,
          });
        } catch (notificationError) {
          console.error("Failed to create report notification:", notificationError);
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

// Unpublish a report while preserving its verification decision.
router.patch(
  "/:id/unpublish",
  authenticate,
  requireRole("MODERATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
      if (reason.length > 1000) {
        return res.status(400).json({ status: "error", message: "Reason must be 1000 characters or fewer" });
      }
      const result = await withTransaction(async (client) => {
        const current = await client.query(
          `SELECT id, reporter_id, title, status, verification_status
           FROM reports WHERE id = $1 FOR UPDATE`, [id]
        );
        const report = current.rows[0];
        if (!report) return null;
        if (report.status !== "PUBLISHED") return { conflict: true as const };

        const updated = await client.query(
          `UPDATE reports SET status = 'DRAFT'::report_status, published_at = NULL, updated_at = NOW()
           WHERE id = $1
           RETURNING id, reporter_id, title, status, verification_status, published_at, updated_at`, [id]
        );
        await createAuditLog({
          userId: req.user!.id,
          action: "REPORT_UNPUBLISHED",
          entityType: "report",
          entityId: id,
          oldData: { status: report.status, verification_status: report.verification_status },
          newData: { status: "DRAFT", verification_status: report.verification_status, ...(reason ? { reason } : {}) },
          req,
          client,
        });
        return { report, updated: updated.rows[0] };
      });

      if (!result) return res.status(404).json({ status: "error", message: "Report not found" });
      if ("conflict" in result) return res.status(409).json({ status: "error", message: "Only published reports can be unpublished" });
      try {
        await createNotification({
          userId: result.report.reporter_id,
          type: "REPORT_STATUS_UPDATED",
          title: "Report unpublished",
          message: `Your report "${result.report.title}" has been unpublished.${reason ? ` Reason: ${reason}` : ""}`,
          entityType: "report",
          entityId: id,
        });
      } catch (error) {
        console.error("Failed to create report notification:", error);
      }
      return res.json({ status: "ok", message: "Report unpublished", report: result.updated });
    } catch (error) {
      console.error("Failed to unpublish report:", error);
      return res.status(500).json({ status: "error", message: "Failed to unpublish report" });
    }
  }
);

// Permanently delete a report and its dependent database records.
router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await withTransaction(async (client) => {
        const current = await client.query(
          `SELECT id, reporter_id, title, status, verification_status
           FROM reports WHERE id = $1 FOR UPDATE`, [id]
        );
        const report = current.rows[0];
        if (!report) return null;
        const assets = await client.query(
          `SELECT cloudinary_public_id FROM evidence
           WHERE report_id = $1 AND cloudinary_public_id IS NOT NULL`, [id]
        );
        await createAuditLog({
          userId: req.user!.id,
          action: "REPORT_DELETED",
          entityType: "report",
          entityId: id,
          oldData: { title: report.title, status: report.status, verification_status: report.verification_status },
          newData: { deleted: true },
          req,
          client,
        });
        await client.query(`DELETE FROM reports WHERE id = $1`, [id]);
        return { report, assets: assets.rows as Array<{ cloudinary_public_id: string }> };
      });

      if (!deleted) return res.status(404).json({ status: "error", message: "Report not found" });
      for (const asset of deleted.assets) {
        try {
          await cloudinary.uploader.destroy(asset.cloudinary_public_id);
        } catch (error) {
          console.error("Failed to remove report evidence from Cloudinary:", error);
        }
      }
      try {
        await createNotification({
          userId: deleted.report.reporter_id,
          type: "REPORT_STATUS_UPDATED",
          title: "Report deleted",
          message: `Your report "${deleted.report.title}" was deleted by a moderator.`,
          entityType: "report",
          entityId: id,
        });
      } catch (error) {
        console.error("Failed to create report notification:", error);
      }
      return res.json({ status: "ok", message: "Report deleted" });
    } catch (error) {
      console.error("Failed to delete report:", error);
      return res.status(500).json({ status: "error", message: "Failed to delete report" });
    }
  }
);

export default router;
