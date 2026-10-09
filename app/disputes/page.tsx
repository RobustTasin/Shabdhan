"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAllDisputes,
  getMyDisputes,
  type ApiDispute,
} from "../lib/disputes-api";
import { getStoredUser } from "../lib/auth";

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

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [loading, setLoading] = useState(true);

  const role = getStoredUser()?.role;
  const isModerator = role === "MODERATOR" || role === "ADMIN";

  useEffect(() => {
    const request = isModerator ? getAllDisputes() : getMyDisputes();

    void request
      .then((response) => setDisputes(response.disputes))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  }, [isModerator]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Disputes
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
          Report disputes
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {isModerator ? "Review disputes across all reports." : "Review disputes submitted against your reports."}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading disputes...
          </p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No disputes
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Disputes submitted against reports will appear here.
          </p>

          <Link
            href="/reports"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            View reports
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/disputes/${dispute.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Report #{dispute.report_id}
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {dispute.report_title}
                  </h2>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${disputeStatusClass(
                    dispute.result
                  )}`}
                >
                  {disputeStatusLabel(dispute.result)}
                </span>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Reason
                </p>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                  {dispute.reason}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-500">
                  Submitted {dispute.created_at}
                </p>

                <span className="font-medium text-slate-900">
                  View dispute →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
