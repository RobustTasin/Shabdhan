import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth";
import {
  loginSchema,
  registerSchema,
} from "../validation/auth";
import {
  sendVerificationSchema,
  verifyEmailSchema,
} from "../validation/emailVerification";
import {
  sendVerificationCode,
  verifyEmailCode,
} from "../services/emailVerification";
import {
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../services/passwordReset";
import {
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
} from "../validation/passwordReset";

const router = Router();

router.post("/send-verification", async (req, res) => {
  const validation = sendVerificationSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message:
        validation.error.issues[0]?.message ??
        "Invalid email address",
    });
  }

  const { email } = validation.data;

  try {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists",
      });
    }

    await sendVerificationCode(email);

    return res.json({
      status: "ok",
      message: "Verification code sent",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Please wait before requesting another code"
    ) {
      return res.status(429).json({
        status: "error",
        message: error.message,
      });
    }

    console.error("Failed to send verification code:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to send verification code",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  const validation = verifyEmailSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message:
        validation.error.issues[0]?.message ??
        "Invalid verification data",
    });
  }

  const { email, code } = validation.data;

  try {
    await verifyEmailCode(email, code);

    return res.json({
      status: "ok",
      message: "Email verified successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      const clientErrors = new Set([
        "No active verification code found",
        "Verification code has expired",
        "Maximum verification attempts exceeded",
        "Invalid verification code",
      ]);

      if (clientErrors.has(error.message)) {
        return res.status(400).json({
          status: "error",
          message: error.message,
        });
      }
    }

    console.error("Email verification failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Email verification failed",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: parsed.error.issues[0]?.message || "Invalid request",
    });
  }

  const { email } = parsed.data;

  try {
    const userResult = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1
         AND is_active = true
       LIMIT 1`,
      [email]
    );

    // Do not reveal whether an account exists.
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        status: "ok",
        message:
          "If an account exists for this email, a verification code has been sent",
      });
    }

    await sendPasswordResetCode(email);

    return res.status(200).json({
      status: "ok",
      message:
        "If an account exists for this email, a verification code has been sent",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Please wait before requesting another code"
    ) {
      return res.status(429).json({
        status: "error",
        message: error.message,
      });
    }

    console.error("Forgot password failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to process password reset request",
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  const parsed = verifyResetCodeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: parsed.error.issues[0]?.message || "Invalid request",
    });
  }

  const { email, code } = parsed.data;

  try {
    await verifyPasswordResetCode(email, code);

    return res.status(200).json({
      status: "ok",
      message: "Password reset code verified successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify password reset code";

    const clientErrors = [
      "No active password reset code found",
      "Password reset code has expired",
      "Maximum verification attempts exceeded",
      "Invalid password reset code",
    ];

    if (clientErrors.includes(message)) {
      return res.status(400).json({
        status: "error",
        message,
      });
    }

    console.error("Password reset verification failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to verify password reset code",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      message: parsed.error.issues[0]?.message || "Invalid request",
    });
  }

  const { email, password } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resetResult = await client.query(
      `SELECT id
       FROM password_resets
       WHERE email = $1
         AND verified_at IS NOT NULL
         AND expires_at > now()
         AND verified_at <= expires_at
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    if (resetResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "Password reset verification required",
      });
    }

    const userResult = await client.query(
      `SELECT id
       FROM users
       WHERE email = $1
         AND is_active = true
       LIMIT 1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        status: "error",
        message: "Password reset verification required",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = now()
       WHERE id = $2`,
      [passwordHash, userResult.rows[0].id]
    );

    await client.query(
      `DELETE FROM password_resets
       WHERE id = $1`,
      [resetResult.rows[0].id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      status: "ok",
      message: "Password reset successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Password reset failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to reset password",
    });
  } finally {
    client.release();
  }
});

router.post("/register", async (req, res) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message:
        validation.error.issues[0]?.message ??
        "Invalid registration data",
    });
  }

  const { username, email, password } = validation.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "Username or email already exists",
      });
    }

    const verification = await client.query(
      `SELECT id
       FROM email_verifications
       WHERE email = $1
         AND verified_at IS NOT NULL
         AND expires_at > now()
         AND expires_at >= verified_at
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    if (verification.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "Email verification required",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (username, email, password_hash, is_verified)
       VALUES ($1, $2, $3, true)
       RETURNING id, username, email, role, is_active, is_verified, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    await client.query(
      `DELETE FROM email_verifications
       WHERE id = $1`,
      [verification.rows[0].id]
    );

    await client.query("COMMIT");

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      status: "ok",
      message: "Registration successful",
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
    await client.query("ROLLBACK");

    console.error("Registration failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  } finally {
    client.release();
  }
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
