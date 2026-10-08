import crypto from "crypto";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import { pool } from "../config/database";

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function sendVerificationCode(
  email: string,
  destination: "user" | "admin" = "user"
) {
  const normalizedEmail = normalizeEmail(email);

  const recentVerification = await pool.query(
    `SELECT created_at
     FROM email_verifications
     WHERE email = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (recentVerification.rows.length > 0) {
    const createdAt = new Date(recentVerification.rows[0].created_at);
    const elapsedSeconds =
      (Date.now() - createdAt.getTime()) / 1000;

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      throw new Error("Please wait before requesting another code");
    }
  }

  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const demoAdminVerification =
    process.env.DEMO_ADMIN_VERIFICATION === "true" &&
    destination === "admin";

  const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL?.trim();

  if (demoAdminVerification && !demoAdminEmail) {
    throw new Error(
      "DEMO_ADMIN_EMAIL is required when demo admin verification is enabled"
    );
  }

  const recipientEmail = demoAdminVerification
    ? demoAdminEmail!
    : normalizedEmail;

  const resend = new Resend(resendApiKey);

  const subject = demoAdminVerification
    ? "Shabdhan demo verification code"
    : "Your Shabdhan verification code";

  const emailContent = demoAdminVerification
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2>Shabdhan Demo Verification</h2>

        <p>A user requested email verification for a project demonstration.</p>

        <p><strong>User email:</strong> ${normalizedEmail}</p>

        <p>The verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
        ">
          ${code}
        </div>

        <p>This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>

        <p>
          This message was sent through Shabdhan's
          <strong>Demo / Project Demonstration</strong> verification mode.
        </p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2>Verify your Shabdhan email</h2>

        <p>Your verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
        ">
          ${code}
        </div>

        <p>This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>

        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Shabdhan <onboarding@resend.dev>",
    to: recipientEmail,
    subject,
    html: emailContent,
  });

  if (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }

  // Invalidate previous active codes only after the new email
  // has been successfully accepted by the email provider.
  await pool.query(
    `UPDATE email_verifications
     SET expires_at = now()
     WHERE email = $1
       AND verified_at IS NULL
       AND expires_at > now()`,
    [normalizedEmail]
  );

  await pool.query(
    `INSERT INTO email_verifications
       (email, code_hash, expires_at)
     VALUES
       ($1, $2, now() + ($3 * interval '1 minute'))`,
    [normalizedEmail, codeHash, VERIFICATION_CODE_EXPIRY_MINUTES]
  );
}

export async function verifyEmailCode(
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
       FROM email_verifications
       WHERE email = $1
         AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      throw new Error("No active verification code found");
    }

    const verification = result.rows[0];

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      throw new Error("Verification code has expired");
    }

    if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new Error("Maximum verification attempts exceeded");
    }

    const validCode = await bcrypt.compare(
      code,
      verification.code_hash
    );

    if (!validCode) {
      await client.query(
        `UPDATE email_verifications
         SET attempts = attempts + 1
         WHERE id = $1`,
        [verification.id]
      );

      await client.query("COMMIT");
      transactionCommitted = true;
      throw new Error("Invalid verification code");
    }

    await client.query(
      `UPDATE email_verifications
       SET verified_at = now()
       WHERE id = $1`,
      [verification.id]
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
