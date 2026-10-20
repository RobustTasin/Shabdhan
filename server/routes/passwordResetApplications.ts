import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../config/database";
import { AuthenticatedRequest, authenticate, requireRole } from "../middleware/auth";
import { createAuditLog } from "../utils/audit";

const router = Router();
const moderators = [authenticate, requireRole("MODERATOR", "ADMIN")];
const emailSchema = z.string().trim().email().max(255).transform((value) => value.toLowerCase());
const idSchema = z.uuid();

router.post("/", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body?.email);
  if (!parsed.success) return res.status(400).json({ status: "error", message: "Enter a valid email address" });
  const email = parsed.data;
  try {
    const user = await pool.query("SELECT 1 FROM users WHERE LOWER(email) = $1 AND is_active = true", [email]);
    if (user.rows.length) {
      await pool.query("INSERT INTO password_reset_applications (email) VALUES ($1)", [email]);
    }
    return res.status(202).json({ status: "ok", message: "If an active account uses this email, the request has been sent to moderators. They will review it and email you a code manually." });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return res.status(409).json({ status: "error", message: "A password reset request is already pending for this email" });
    console.error("Failed to create password reset application:", error);
    return res.status(500).json({ status: "error", message: "Unable to submit password reset request" });
  }
});

router.get("/", ...moderators, async (req, res) => {
  const status = String(req.query.status ?? "ALL").toUpperCase();
  if (!( ["ALL", "PENDING", "APPROVED", "DECLINED", "COMPLETED"] as const).includes(status as "ALL" | "PENDING" | "APPROVED" | "DECLINED" | "COMPLETED")) return res.status(400).json({ status: "error", message: "Invalid application status" });
  try {
    const values: string[] = [];
    const where = status === "ALL" ? "" : (values.push(status), `WHERE p.status = $${values.length}`);
    const result = await pool.query(
      `SELECT p.id, p.application_number::text, p.email, p.status, p.created_at,
              p.reviewed_at, p.code_expires_at, u.username AS reviewed_by_username,
              EXISTS(SELECT 1 FROM users account WHERE LOWER(account.email) = LOWER(p.email)) AS account_exists
       FROM password_reset_applications p LEFT JOIN users u ON u.id = p.reviewed_by
       ${where} ORDER BY CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END, p.created_at DESC LIMIT 200`, values
    );
    return res.json({ status: "ok", applications: result.rows });
  } catch (error) {
    console.error("Failed to load password reset applications:", error);
    return res.status(500).json({ status: "error", message: "Unable to load password reset applications" });
  }
});

router.post("/:id/approve", ...moderators, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  const code = z.string().trim().regex(/^[A-Z]{6}$/).safeParse(String(req.body?.code ?? "").toUpperCase());
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  if (!code.success) return res.status(400).json({ status: "error", message: "Enter a six-letter code (A–Z)" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, application_number, email, status FROM password_reset_applications WHERE id = $1 FOR UPDATE", [id.data]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ status: "error", message: "Application not found" }); }
    const application = found.rows[0];
    if (application.status !== "PENDING") { await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "Only pending applications can be approved" }); }
    const account = await client.query("SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true", [application.email]);
    if (!account.rows.length) { await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "No active account exists for this email" }); }
    await client.query(
      `UPDATE password_reset_applications SET status = 'APPROVED', code_hash = $1,
       code_expires_at = NOW() + INTERVAL '48 hours', attempts = 0,
       reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [await bcrypt.hash(code.data, 10), req.user!.id, id.data]
    );
    await createAuditLog({ userId: req.user!.id, action: "PASSWORD_RESET_APPLICATION_APPROVED", entityType: "password_reset_application", entityId: id.data, newData: { application_number: application.application_number, email: application.email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: "Request approved. Manually email the six-letter code to the user." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to approve password reset application:", error);
    return res.status(500).json({ status: "error", message: "Unable to approve password reset request" });
  } finally { client.release(); }
});

router.post("/:id/decline", ...moderators, async (req: AuthenticatedRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ status: "error", message: "Application not found" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, application_number, email, status FROM password_reset_applications WHERE id = $1 FOR UPDATE", [id.data]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ status: "error", message: "Application not found" }); }
    const application = found.rows[0];
    if (application.status !== "PENDING") { await client.query("ROLLBACK"); return res.status(409).json({ status: "error", message: "Only pending applications can be declined" }); }
    await client.query("UPDATE password_reset_applications SET status = 'DECLINED', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2", [req.user!.id, id.data]);
    await createAuditLog({ userId: req.user!.id, action: "PASSWORD_RESET_APPLICATION_DECLINED", entityType: "password_reset_application", entityId: id.data, newData: { application_number: application.application_number, email: application.email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: "Request declined. Manually notify the user if appropriate." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to decline password reset application:", error);
    return res.status(500).json({ status: "error", message: "Unable to decline password reset request" });
  } finally { client.release(); }
});

router.post("/complete", async (req, res) => {
  const parsed = z.object({ email: emailSchema, code: z.string().trim().regex(/^[A-Za-z]{6}$/), password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ status: "error", message: parsed.error.issues[0]?.message ?? "Invalid password reset details" });
  const { email, password } = parsed.data;
  const code = parsed.data.code.toUpperCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT id, code_hash, attempts FROM password_reset_applications
       WHERE LOWER(email) = $1 AND status = 'APPROVED' AND code_expires_at > NOW()
       ORDER BY reviewed_at DESC LIMIT 1 FOR UPDATE`, [email]
    );
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(400).json({ status: "error", message: "No valid reset code was found. Request a new code from moderators." }); }
    const application = found.rows[0];
    if (application.attempts >= 5) { await client.query("ROLLBACK"); return res.status(429).json({ status: "error", message: "Too many attempts. Request a new code." }); }
    if (!(await bcrypt.compare(code, String(application.code_hash).trim()))) {
      await client.query("UPDATE password_reset_applications SET attempts = attempts + 1 WHERE id = $1", [application.id]);
      await client.query("COMMIT");
      return res.status(400).json({ status: "error", message: "The code is incorrect" });
    }
    const user = await client.query("SELECT id FROM users WHERE LOWER(email) = $1 AND is_active = true FOR UPDATE", [email]);
    if (!user.rows.length) { await client.query("ROLLBACK"); return res.status(400).json({ status: "error", message: "No active account exists for this email" }); }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [passwordHash, user.rows[0].id]);
    await client.query("UPDATE password_reset_applications SET status = 'COMPLETED', code_hash = NULL, code_expires_at = NULL, updated_at = NOW() WHERE id = $1", [application.id]);
    await client.query("UPDATE password_reset_applications SET status = 'DECLINED', code_hash = NULL, code_expires_at = NULL, updated_at = NOW() WHERE LOWER(email) = $1 AND status = 'APPROVED'", [email]);
    await createAuditLog({ userId: user.rows[0].id, action: "PASSWORD_RESET_COMPLETED", entityType: "password_reset_application", entityId: application.id, newData: { email }, req, client });
    await client.query("COMMIT");
    return res.json({ status: "ok", message: "Password reset successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to reset password:", error);
    return res.status(500).json({ status: "error", message: "Unable to reset password" });
  } finally { client.release(); }
});

export default router;
