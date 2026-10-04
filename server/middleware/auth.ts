import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { JWT_SECRET } from "../config/auth";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const token = header.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id?: string;
    };

    if (!payload.id) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token",
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         username,
         role,
         is_active
       FROM users
       WHERE id = $1`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "User account not found",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Account is inactive",
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Authentication service unavailable",
    });
  }
}

export function requireRole(...roles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions",
      });
    }

    next();
  };
}
