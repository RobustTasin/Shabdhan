import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../config/database";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth";
import { createAuditLog } from "../utils/audit";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth";
import {
  loginSchema,
} from "../validation/auth";

const router = Router();

const membershipSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  code: z.string().trim().regex(/^[A-Za-z]{6}$/).transform((value) => value.toUpperCase()),
  username: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9_]+$/),
  password: z.string().min(8).max(128),
});
router.post("/complete-membership", async (req, res) => {
  const parsed = membershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ status: "error", message: parsed.error.issues[0]?.message ?? "Invalid account details" });
  }

  const { email, username, password } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const application = await client.query(
      `SELECT id, email, code_hash, attempts FROM membership_applications
       WHERE LOWER(email) = $1 AND status = 'APPROVED' AND account_created_at IS NULL
         AND code_expires_at > NOW()
       ORDER BY reviewed_at DESC LIMIT 1 FOR UPDATE`, [email]
    );
    if (application.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ status: "error", message: "No valid membership approval code was found for this email" });
    }

    const { id: applicationId, code_hash: codeHash, attempts } = application.rows[0];
    if (attempts >= 5) {
      await client.query("ROLLBACK");
      return res.status(429).json({ status: "error", message: "Too many code attempts. Contact a moderator for a new code." });
    }
    if (!(await bcrypt.compare(parsed.data.code, String(codeHash).trim()))) {
      await client.query("UPDATE membership_applications SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1", [applicationId]);
      await client.query("COMMIT");
      return res.status(403).json({ status: "error", message: "The membership code is incorrect" });
    }
    // Serialize username claims case-insensitively so concurrent account
    // creation requests cannot claim the same visible name with different case.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended(LOWER($1), 0))", [username]);
    const existing = await client.query(
      "SELECT id, CASE WHEN LOWER(username) = LOWER($2) THEN 'username' ELSE 'email' END AS conflict FROM users WHERE LOWER(email) = $1 OR LOWER(username) = LOWER($2) LIMIT 1",
      [email, username]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ status: "error", message: existing.rows[0].conflict === "username" ? "That username is already taken. Choose another one." : "An account already exists for this email." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await client.query(
      `INSERT INTO users (username, email, password_hash, is_verified)
       VALUES ($1, $2, $3, true)
       RETURNING id, username, email, role, is_verified`,
      [username, email, passwordHash]
    );
    const user = created.rows[0];
    await client.query("UPDATE membership_applications SET account_created_at = NOW(), updated_at = NOW() WHERE id = $1", [applicationId]);
    await createAuditLog({
      userId: user.id,
      action: "MEMBERSHIP_ACCOUNT_CREATED",
      entityType: "membership_application",
      entityId: applicationId,
      newData: { email },
      req,
      client,
    });
    await client.query("COMMIT");

    const authToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return res.status(201).json({
      status: "ok",
      message: "Your Shabdhan account is ready",
      user: { id: user.id, username: user.username, email: user.email, role: user.role, is_verified: user.is_verified },
      token: authToken,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return res.status(409).json({ status: "error", message: "That email or username is already in use" });
    }
    console.error("Failed to complete membership:", error);
    return res.status(500).json({ status: "error", message: "Unable to create your account" });
  } finally {
    client.release();
  }
});

// Self-service registration is disabled. Only moderator-approved applicants may create accounts.
router.post("/register", (_req, res) => {
  return res.status(403).json({
    status: "error",
    message: "Apply for membership first. After approval, check eligibility to create your account.",
  });
});

router.post("/login", async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message:
        validation.error.issues[0]?.message ??
        "Invalid login data",
    });
  }

  const { email, password } = validation.data;

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, role, is_active, is_verified
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Account is inactive",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      status: "ok",
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
      token,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});

router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT id, username, email, role, is_active, is_verified, created_at
         FROM users
         WHERE id = $1`,
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (!result.rows[0].is_active) {
        return res.status(403).json({
          status: "error",
          message: "Account is inactive",
        });
      }

      return res.json({
        status: "ok",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to fetch current user:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch current user",
      });
    }
  }
);

export default router;
