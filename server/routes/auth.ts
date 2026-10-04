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

const router = Router();

router.post("/register", async (req, res) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message: validation.error.issues[0]?.message ?? "Invalid registration data",
    });
  }

  const { username, email, password } = validation.data;

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Username or email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, is_active, is_verified, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

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
    console.error("Registration failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
});

router.post("/login", async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message: validation.error.issues[0]?.message ?? "Invalid login data",
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
