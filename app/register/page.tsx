"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import {
  sendVerification,
  verifyEmail,
} from "../lib/auth";

type Step = "email" | "code" | "account";

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser } = useAuth();

  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationDestination, setVerificationDestination] =
    useState<"user" | "admin">("user");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleSendCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await sendVerification(email.trim(), verificationDestination);

      setStep("code");
      setResendCooldown(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Verification code must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      await verifyEmail(email.trim(), code.trim());

      setStep("account");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify email"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(
        username.trim(),
        email.trim(),
        password
      );

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;

    setError("");
    setLoading(true);

    try {
      await sendVerification(email.trim(), verificationDestination);
      setCode("");
      setResendCooldown(60);
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

  function changeEmail() {
    setError("");
    setCode("");
    setStep("email");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
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
            <div className="mb-4 flex items-center gap-2">
              {[
                ["email", "1"],
                ["code", "2"],
                ["account", "3"],
              ].map(([name, number]) => (
                <div
                  key={name}
                  className={`h-1.5 flex-1 rounded-full ${
                    name === step ||
                    (step === "code" && name === "email") ||
                    step === "account"
                      ? "bg-slate-900"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {step === "email" && (
              <>
                <h1 className="text-xl font-semibold text-slate-950">
                  Create account
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Start by verifying your email address.
                </p>
              </>
            )}

            {step === "code" && (
              <>
                <h1 className="text-xl font-semibold text-slate-950">
                  Verify your email
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  We sent a 6-digit verification code to{" "}
                  <span className="font-medium text-slate-700">
                    {email}
                  </span>
                  .
                </p>
              </>
            )}

            {step === "account" && (
              <>
                <h1 className="text-xl font-semibold text-slate-950">
                  Create your account
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Your email has been verified. Choose your
                  username and password.
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === "email" && (
            <form
              onSubmit={handleSendCode}
              className="mt-6 space-y-5"
            >
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
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-slate-700">
                  Verification method
                </p>

                <div className="mt-2 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3 transition hover:border-slate-400">
                    <input
                      type="radio"
                      name="verificationDestination"
                      value="user"
                      checked={verificationDestination === "user"}
                      onChange={() =>
                        setVerificationDestination("user")
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        Send to my email
                      </span>

                      <span className="mt-0.5 block text-xs text-slate-500">
                        Send the verification code to the email address
                        you entered above.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:border-amber-300">
                    <input
                      type="radio"
                      name="verificationDestination"
                      value="admin"
                      checked={verificationDestination === "admin"}
                      onChange={() =>
                        setVerificationDestination("admin")
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        Send to ADMIN (MT21)
                      </span>

                      <span className="mt-0.5 block text-xs text-slate-600">
                        Demo / project demonstration only. The verification
                        code will be sent to the project administrator.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Send verification code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form
              onSubmit={handleVerifyCode}
              className="mt-6 space-y-5"
            >
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
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-xl font-semibold tracking-[0.35em] outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify email"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={changeEmail}
                  className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="font-medium text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "account" && (
            <form
              onSubmit={handleCreateAccount}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-700"
                >
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter your password again"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Creating account..."
                  : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-900 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
