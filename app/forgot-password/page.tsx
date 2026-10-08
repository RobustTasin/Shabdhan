"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resetPassword,
  sendPasswordReset,
  verifyPasswordReset,
} from "../lib/auth";

type Step = "email" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  function startCooldown() {
    setResendCooldown(60);

    const interval = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordReset(email);

      setStep("code");
      setSuccess(
        "If an account exists for this email, a verification code has been sent."
      );

      startCooldown();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send password reset code"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("Verification code must be 6 digits");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await verifyPasswordReset(email, code);

      setStep("password");
      setSuccess("Code verified. You can now create a new password.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify reset code"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || loading) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordReset(email);

      setCode("");
      setSuccess("A new verification code has been sent.");
      startCooldown();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend verification code"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await resetPassword(email, password);

      router.replace("/login?reset=success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-slate-950"
          >
            Shabdhan
          </Link>

          <p className="mt-2 text-sm text-slate-500">
            Trust & verification
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              Reset your password
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {step === "email" &&
                "Enter your email address to receive a reset code."}

              {step === "code" &&
                "Enter the 6-digit code sent to your email."}

              {step === "password" &&
                "Create a new password for your account."}
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            {(["email", "code", "password"] as Step[]).map(
              (item, index) => (
                <div
                  key={item}
                  className={`h-1.5 flex-1 rounded-full ${
                    index <=
                    ["email", "code", "password"].indexOf(step)
                      ? "bg-slate-900"
                      : "bg-slate-200"
                  }`}
                />
              )
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {success}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleSendCode} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-700"
                >
                  Verification code
                </label>

                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-xl font-semibold tracking-[0.5em] outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify code"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                    setSuccess("");
                  }}
                  className="font-medium text-slate-600 hover:text-slate-900"
                >
                  Change email
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendCode}
                  className="font-medium text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={handleResetPassword}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  New password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm new password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter the password again"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            <Link
              href="/login"
              className="font-medium text-slate-900 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
