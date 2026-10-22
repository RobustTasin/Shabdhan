import { Response, Router } from "express";
import bcrypt from "bcrypt";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../config/database";
import { JWT_SECRET } from "../config/auth";
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
const codeSchema = z.string().trim().regex(/^[A-Za-z0-9]{6}$/).transform((value) => value.toUpperCase());
const approvalCodeKey = createHash("sha256").update(`shabdhan-membership-approval-code:v1:${JWT_SECRET}`).digest();

function encryptApprovalCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", approvalCodeKey, iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function decryptApprovalCode(value: string | null) {
  if (!value) return null;
  try {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(":");
    if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) return null;
    const decipher = createDecipheriv("aes-256-gcm", approvalCodeKey, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

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

router.post("/eligibility", async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ status: "error", message: parsed.error.issues[0]?.message ?? "Enter your application email" });
  const { email } = parsed.data;
  try {
    const result = await pool.query(
      `SELECT 1 FROM membership_applications a
       WHERE LOWER(a.email) = $1 AND a.status = 'APPROVED' AND a.account_created_at IS NULL
         AND a.code_hash IS NOT NULL AND a.code_expires_at > NOW() AND a.attempts < 5
         AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = $1)
       LIMIT 1`, [email]
    );
    return res.json({ status: "ok", eligible: result.rows.length > 0 });
  } catch (error) {
    console.error("Failed to check membership eligibility:", error);
    return res.status(500).json({ status: "error", message: "Unable to check eligibility" });
  }
});

router.post("/eligibility/code", async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()), code: codeSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ status: "error", message: parsed.error.issues[0]?.message ?? "Enter your approved email and six-character code" });
  const { email, code } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT a.id, a.code_hash, a.attempts FROM membership_applications a
       WHERE LOWER(a.email) = $1 AND a.status = 'APPROVED' AND a.account_created_at IS NULL
         AND a.code_expires_at > NOW()
         AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = $1)
       ORDER BY a.reviewed_at DESC LIMIT 1 FOR UPDATE`, [email]
    );
    if (!result.rows.length || result.rows[0].attempts >= 5) {
      await client.query("ROLLBACK");
      return res.json({ status: "ok", eligible: false });
    }
    const application = result.rows[0];
    const eligible = await bcrypt.compare(code, String(application.code_hash).trim());
    if (!eligible) await client.query("UPDATE membership_applications SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1", [application.id]);
    await client.query("COMMIT");
    return res.json({ status: "ok", eligible });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to check membership eligibility:", error);
    return res.status(500).json({ status: "error", message: "Unable to check eligibility" });
  } finally { client.release(); }
});

router.get("/", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const requestedStatus = String(req.query.status ?? "ALL").toUpperCase();
  if (!( ["ALL", "PENDING", "APPROVED", "DECLINED"] as const).includes(requestedStatus as "ALL" | "PENDING" | "APPROVED" | "DECLINED")) return res.status(400).json({ status: "error", message: "Invalid application status" });
  try {
    const values: string[] = [];
    const where = requestedStatus === "ALL" ? "" : (values.push(requestedStatus), `WHERE a.status = $${values.length}`);
    const result = await pool.query(
      `SELECT a.id, a.application_number::text, a.email, a.social_platform, a.social_url,
              a.status, a.created_at, a.reviewed_at, a.code_expires_at, a.code_encrypted, a.account_created_at,
              reviewer.username AS reviewed_by_username
       FROM membership_applications a LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
       ${where} ORDER BY CASE WHEN a.status = 'PENDING' THEN 0 ELSE 1 END, a.created_at DESC LIMIT 200`, values
    );
    const applications = result.rows.map((application) => ({
      ...application,
      approval_code: application.status === "APPROVED" && !application.account_created_at && application.code_expires_at && new Date(application.code_expires_at).getTime() > Date.now()
        ? decryptApprovalCode(application.code_encrypted)
        : null,
      code_encrypted: undefined,
    }));
    return res.json({ status: "ok", applications });
  } catch (error) {
    console.error("Failed to load membership applications:", error);
    return res.status(500).json({ status: "error", message: "Unable to load membership applications" });
  }
});

async function reviewApplication(id: string, action: "APPROVED" | "DECLINED", code: string | undefined, req: AuthenticatedRequest, res: Response) {
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
    const codeHash = action === "APPROVED" ? await bcrypt.hash(code!, 10) : null;
    await client.query(
      `UPDATE membership_applications SET status = $1, code_hash = $2, code_encrypted = $5,
       code_expires_at = CASE WHEN $1 = 'APPROVED' THEN NOW() + INTERVAL '48 hours' ELSE NULL END,
       attempts = 0, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $4`,
      [action, codeHash, req.user!.id, id, action === "APPROVED" ? encryptApprovalCode(code!) : null]
    );
    await createAuditLog({ userId: req.user!.id, action: `MEMBERSHIP_APPLICATION_${action}`, entityType: "membership_application", entityId: id, newData: { application_number: app.application_number, email: app.email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: action === "APPROVED" ? "Application approved. Manually email the six-character code to the applicant within 48 hours." : "Application declined. Manually email the applicant with the decision." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to review membership application:", error);
    return res.status(500).json({ status: "error", message: "Unable to review membership application" });
  } finally { client.release(); }
}

router.post("/:id/approve", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  const code = codeSchema.safeParse(req.body?.code);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  if (!code.success) return res.status(400).json({ status: "error", message: "Enter a six-character code using letters and numbers before approving" });
  return reviewApplication(id.data, "APPROVED", code.data, req, res);
});
router.post("/:id/decline", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  return reviewApplication(id.data, "DECLINED", undefined, req, res);
});

router.post("/:id/code", ...reviewer, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  const code = codeSchema.safeParse(req.body?.code);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  if (!code.success) return res.status(400).json({ status: "error", message: "Enter a six-character code using letters and numbers" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, application_number, email, status, account_created_at FROM membership_applications WHERE id = $1 FOR UPDATE", [id.data]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ status: "error", message: "Application not found" }); }
    const application = found.rows[0];
    if (application.status !== "APPROVED" || application.account_created_at) { await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "A code can only be issued for an approved application without an account" }); }
    await client.query("UPDATE membership_applications SET code_hash = $1, code_encrypted = $2, code_expires_at = NOW() + INTERVAL '48 hours', attempts = 0, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $4", [await bcrypt.hash(code.data, 10), encryptApprovalCode(code.data), req.user!.id, id.data]);
    await createAuditLog({ userId: req.user!.id, action: "MEMBERSHIP_APPLICATION_CODE_ISSUED", entityType: "membership_application", entityId: id.data, newData: { application_number: application.application_number, email: application.email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: "Code set. Manually email it to the applicant within 48 hours." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to issue membership application code:", error);
    return res.status(500).json({ status: "error", message: "Unable to issue membership application code" });
  } finally { client.release(); }
});

export default router;
