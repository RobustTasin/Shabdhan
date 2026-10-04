"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getDispute,
  reviewDispute,
  type ApiDispute,
} from "../../lib/disputes-api";
import { useAuth } from "../../components/AuthProvider";

function disputeStatusLabel(result: ApiDispute["result"]): string {
  if (result === "UPHELD") return "Upheld";
  if (result === "REJECTED") return "Rejected";
  return "Pending";
}

function disputeStatusClass(result: ApiDispute["result"]): string {
  if (result === "UPHELD") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (result === "REJECTED") {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
}

export default function DisputeDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const { user } = useAuth();

  const [dispute, setDispute] = useState<ApiDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    void getDispute(id)
      .then((response) => setDispute(response.dispute))
      .catch((err) => {
        setDispute(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dispute"
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleReview(result: "UPHELD" | "REJECTED") {
    if (!dispute || dispute.result !== "PENDING") return;

    setReviewing(true);
    setError("");

    try {
      const response = await reviewDispute(id, result);
      setDispute(response.dispute);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to review dispute"
      );
    } finally {
      setReviewing(false);
    }
  }

  const canReview =
    user?.role === "MODERATOR" || user?.role === "ADMIN";

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/disputes"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to disputes
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Loading dispute...
          </p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="space-y-4">
        <Link
          href="/disputes"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to disputes
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-slate-950">
            Dispute not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "The dispute you are looking for does not exist."}
          </p>
        </div>
      </div>
    );
  }

  const isPending = dispute.result === "PENDING";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/disputes"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to disputes
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Dispute #{dispute.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {dispute.report_title}
            </h1>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${disputeStatusClass(
              dispute.result
            )}`}
          >
            {disputeStatusLabel(dispute.result)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Dispute details
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Report
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {dispute.report_title}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Reason
              </p>

              <div className="mt-2 rounded-lg bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {dispute.reason}
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Submitted
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {new Date(dispute.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {disputeStatusLabel(dispute.result)}
                </p>
              </div>
            </div>

            {dispute.review_notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Review notes
                </p>

                <div className="mt-2 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">
                    {dispute.review_notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Actions
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage this dispute and inspect the associated report.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              href={`/reports/${dispute.report_id}`}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View report
            </Link>

            {canReview && isPending && (
              <>
                <button
                  type="button"
                  onClick={() => void handleReview("UPHELD")}
                  disabled={reviewing}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewing ? "Reviewing..." : "Uphold dispute"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleReview("REJECTED")}
                  disabled={reviewing}
                  className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewing ? "Reviewing..." : "Reject dispute"}
                </button>
              </>
            )}

            {canReview && !isPending && (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                This dispute has already been reviewed.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
