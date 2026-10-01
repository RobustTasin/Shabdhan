import { Request } from "express";
import { pool } from "../config/database";

interface AuditLogInput {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  req?: Request;
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  req,
}: AuditLogInput) {
  await pool.query(
    `INSERT INTO audit_logs
      (
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        ip_address,
        user_agent
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId ?? null,
      action,
      entityType ?? null,
      entityId ?? null,
      oldData ?? null,
      newData ?? null,
      req?.ip ?? null,
      req?.get("user-agent") ?? null,
    ]
  );
}