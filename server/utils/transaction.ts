import { PoolClient } from "pg";
import { pool } from "../config/database";

// Runs `work` inside a database transaction. If it throws, everything it
// did is rolled back, so a change and its audit-log entry are saved
// together or not at all.
//
// Inside `work`, always use the `client` it is given (including for
// createAuditLog) and never `pool`: queries on `pool` run on a different
// connection and sit outside the transaction.
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await work(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back transaction:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}
