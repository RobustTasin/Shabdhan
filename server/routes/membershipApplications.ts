import { Response, Router } from "express";
import { z } from "zod";
import { pool } from "../config/database";
import { AuthenticatedRequest, authenticate, requireRole } from "../middleware/auth";
import { createAuditLog } from "../utils/audit";

const router = Router();
const reviewer = [authenticate, requireRole("MODERATOR", "ADMIN")];
const applicationSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  social_platform: z.string().trim().min(2).max(50),
  social_url: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Use a valid http or https profile link"),
});
const idSchema = z.uuid();

router.post("/", async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ status: "error", message: parsed.error.issues[0]?.message ?? "Invalid application" });
  const { email, social_platform, social_url } = parsed.data;
  try {
    if ((await pool.query("SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1", [email])).rows.length) {
      return res.status(409).json({ status: "error", message: "An account already exists for this email. Try logging in or resetting your password." });
    }
    const result = await pool.query(
      `INSERT INTO membership_applications (email, social_platform, social_url)
       VALUES ($1, $2, $3) RETURNING id, application_number::text`,
      [email, social_platform, social_url]
    );
    return res.status(201).json({ status: "ok", message: "Application received. A moderator will email you with the decision within 48 hours.", application_number: result.rows[0].application_number });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return res.status(409).json({ status: "error", message: "A pending application already exists for this email." });
    console.error("Failed to submit membership application:", error);
    return res.status(500).json({ status: "error", message: "Unable to submit membership application" });
  }
});

router.get("/eligibility", async (req, res) => {
  const parsed = z.string().trim().email().max(255).safeParse(req.query.email);
  if (!parsed.success) return res.status(400).json({ status: "error", message: "Enter a valid email address" });
  const email = parsed.data.toLowerCase();
  try {
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM membership_applications a
         WHERE LOWER(a.email) = $1 AND a.status = 'APPROVED' AND a.account_created_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = $1)
       ) AS eligible`, [email]
    );
    return res.json({ status: "ok", eligible: result.rows[0].eligible });
  } catch (error) {
    console.error("Failed to check membership eligibility:", error);
    return res.status(500).json({ status: "error", message: "Unable to check eligibility" });
  }
});

router.get("/", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const requestedStatus = String(req.query.status ?? "ALL").toUpperCase();
  if (!( ["ALL", "PENDING", "APPROVED", "DECLINED"] as const).includes(requestedStatus as "ALL" | "PENDING" | "APPROVED" | "DECLINED")) return res.status(400).json({ status: "error", message: "Invalid application status" });
  try {
    const values: string[] = [];
    const where = requestedStatus === "ALL" ? "" : (values.push(requestedStatus), `WHERE a.status = $${values.length}`);
    const result = await pool.query(
      `SELECT a.id, a.application_number::text, a.email, a.social_platform, a.social_url,
              a.status, a.created_at, a.reviewed_at, a.account_created_at,
              reviewer.username AS reviewed_by_username
       FROM membership_applications a LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
       ${where} ORDER BY CASE WHEN a.status = 'PENDING' THEN 0 ELSE 1 END, a.created_at DESC LIMIT 200`, values
    );
    return res.json({ status: "ok", applications: result.rows });
  } catch (error) {
    console.error("Failed to load membership applications:", error);
    return res.status(500).json({ status: "error", message: "Unable to load membership applications" });
  }
});

async function reviewApplication(id: string, action: "APPROVED" | "DECLINED", req: AuthenticatedRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, application_number, email, status FROM membership_applications WHERE id = $1 FOR UPDATE", [id]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ status: "error", message: "Application not found" }); }
    const app = found.rows[0];
    if (app.status !== "PENDING") { await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "Only pending applications can be reviewed" }); }
    if (action === "APPROVED" && (await client.query("SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)", [app.email])).rows.length) {
      await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "An account already exists for this email" });
    }
    await client.query("UPDATE membership_applications SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3", [action, req.user!.id, id]);
    await createAuditLog({ userId: req.user!.id, action: `MEMBERSHIP_APPLICATION_${action}`, entityType: "membership_application", entityId: id, newData: { application_number: app.application_number, email: app.email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: action === "APPROVED" ? "Application approved. Manually email the applicant; they can now create an account with this email." : "Application declined. Manually email the applicant with the decision." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to review membership application:", error);
    return res.status(500).json({ status: "error", message: "Unable to review membership application" });
  } finally { client.release(); }
}

router.post("/:id/approve", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  return reviewApplication(id.data, "APPROVED", req, res);
});
router.post("/:id/decline", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  return reviewApplication(id.data, "DECLINED", req, res);
});

export default router;
