"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";
import { getSafeReturnPath } from "../lib/navigation";
import PublicSiteHeader from "../components/PublicSiteHeader";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      const next = getSafeReturnPath(
        new URLSearchParams(window.location.search).get("next")
      );
      router.replace(next ?? "/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f6f5]">
      <PublicSiteHeader />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl">
        <div className="rounded-3xl border border-[#dbe7e5] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,37,0.08)] sm:p-9">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e817d]">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#123d3b]">Sign in</h1>

            <p className="mt-2 text-sm leading-6 text-[#627573]">
              Sign in to your Shabdhan account.
            </p>
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#344f4e]"
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
                className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-[#fbfdfd] px-4 py-3 text-sm text-[#1d3837] outline-none transition placeholder:text-[#899c99] focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#344f4e]"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#326966] hover:text-[#123d3b] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-[#fbfdfd] px-4 py-3 text-sm text-[#1d3837] outline-none transition placeholder:text-[#899c99] focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#123d3b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#225c57] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-7 space-y-4 border-t border-[#e3eeec] pt-6 text-center text-sm text-[#627573]">
            <p>Already applied?{" "}<Link href="/account/create" className="font-semibold text-[#123d3b] hover:underline">Create account</Link></p>
            <p>New to Shabdhan?{" "}<Link href="/apply" className="font-semibold text-[#123d3b] hover:underline">Apply for membership</Link></p>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
