import { pool } from "../config/database";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  entityType = "report",
  entityId,
}: CreateNotificationParams) {
  const result = await pool.query(
    `INSERT INTO notifications
     (
       user_id,
       type,
       title,
       message,
       entity_type,
       entity_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       id,
       user_id,
       type,
       title,
       message,
       entity_type,
       entity_id,
       is_read,
       created_at,
       read_at`,
    [
      userId,
      type,
      title,
      message,
      entityType,
      entityId || null,
    ]
  );

  return result.rows[0];
}