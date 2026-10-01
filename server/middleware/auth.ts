import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authenticate(
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
      id: string;
      username: string;
      role: string;
    };

    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
}
