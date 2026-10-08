import crypto from "crypto";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import { pool } from "../config/database";

const RESET_CODE_EXPIRY_MINUTES = 10;
const MAX_RESET_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateResetCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function sendPasswordResetCode(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const recentReset = await pool.query(
    `SELECT created_at
     FROM password_resets
     WHERE email = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (recentReset.rows.length > 0) {
    const createdAt = new Date(recentReset.rows[0].created_at);
    const elapsedSeconds =
      (Date.now() - createdAt.getTime()) / 1000;

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      throw new Error("Please wait before requesting another code");
    }
  }

  const code = generateResetCode();
  const codeHash = await bcrypt.hash(code, 10);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from:
      process.env.EMAIL_FROM ||
      "Shabdhan <onboarding@resend.dev>",
    to: normalizedEmail,
    subject: "Reset your Shabdhan password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2>Reset your Shabdhan password</h2>

        <p>Your password reset code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
        ">
          ${code}
        </div>

        <p>This code expires in ${RESET_CODE_EXPIRY_MINUTES} minutes.</p>

        <p>
          If you did not request a password reset, you can safely ignore
          this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }

  await pool.query(
    `UPDATE password_resets
     SET expires_at = now()
     WHERE email = $1
       AND verified_at IS NULL
       AND expires_at > now()`,
    [normalizedEmail]
  );

  await pool.query(
    `INSERT INTO password_resets
       (email, code_hash, expires_at)
     VALUES
       ($1, $2, now() + ($3 * interval '1 minute'))`,
    [normalizedEmail, codeHash, RESET_CODE_EXPIRY_MINUTES]
  );
}

export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  const client = await pool.connect();

  let transactionCommitted = false;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, code_hash, expires_at, attempts
       FROM password_resets
       WHERE email = $1
         AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      throw new Error("No active password reset code found");
    }

    const reset = result.rows[0];

    if (new Date(reset.expires_at).getTime() < Date.now()) {
      throw new Error("Password reset code has expired");
    }

    if (reset.attempts >= MAX_RESET_ATTEMPTS) {
      throw new Error("Maximum verification attempts exceeded");
    }

    const validCode = await bcrypt.compare(
      code,
      reset.code_hash
    );

    if (!validCode) {
      await client.query(
        `UPDATE password_resets
         SET attempts = attempts + 1
         WHERE id = $1`,
        [reset.id]
      );

      await client.query("COMMIT");
      transactionCommitted = true;
      throw new Error("Invalid password reset code");
    }

    await client.query(
      `UPDATE password_resets
       SET verified_at = now()
       WHERE id = $1`,
      [reset.id]
    );

    await client.query("COMMIT");

    return true;
  } catch (error) {
    if (!transactionCommitted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}
