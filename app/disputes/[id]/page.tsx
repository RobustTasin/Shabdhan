"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getDisputes,
  getReports,
  saveDisputes,
  type Dispute,
} from "../../lib/reports";

export default function DisputeDetailsPage() {
  const params = useParams();
  const id = Number(params.id);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const disputes = getDisputes();
    const found = disputes.find((item) => item.id === id);

    setDispute(found ?? null);
  }, [id]);

  function handleResolve() {
    if (!dispute || dispute.status === "Resolved") return;

    setResolving(true);

    const updatedDispute: Dispute = {
      ...dispute,
      status: "Resolved",
    };

    const disputes = getDisputes();

    const updatedDisputes = disputes.map((item) =>
      item.id === updatedDispute.id ? updatedDispute : item
    );

    saveDisputes(updatedDisputes);
    setDispute(updatedDispute);
    setResolving(false);
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
            The dispute you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  const isOpen = dispute.status === "Open";

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
              {dispute.reportTitle}
            </h1>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${
              isOpen
                ? "bg-red-100 text-red-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {dispute.status}
          </span>
        </div>
      </div>

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
                {dispute.reportTitle}
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
                  {dispute.createdAt}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {dispute.status}
                </p>
              </div>
            </div>
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
              href={`/reports/${dispute.reportId}`}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View report
            </Link>

            <button
              type="button"
              onClick={handleResolve}
              disabled={!isOpen || resolving}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isOpen
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              {resolving
                ? "Resolving..."
                : isOpen
                  ? "Resolve dispute"
                  : "Dispute resolved"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
