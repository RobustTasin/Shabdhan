"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getUserEvidence,
  type UserEvidence,
} from "../lib/evidence-api";

function formatEvidenceType(type: UserEvidence["evidence_type"]) {
  switch (type) {
    case "IMAGE":
      return "Image";
    case "VIDEO":
      return "Video";
    case "DOCUMENT":
      return "Document";
    case "LINK":
      return "Link";
    case "OTHER":
      return "Other";
    default:
      return type;
  }
}

function verificationBadgeClass(
  status: UserEvidence["verification_status"]
) {
  switch (status) {
    case "VERIFIED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<UserEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvidence() {
      setLoading(true);
      setError("");

      try {
        const response = await getUserEvidence();

        if (!cancelled) {
          setEvidence(response.evidence);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load evidence"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvidence();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Evidence
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
          Evidence library
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Evidence attached to your reports.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading evidence...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-800">
            {error}
          </p>
        </div>
      ) : evidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No evidence yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add evidence from a report&apos;s details page.
          </p>

          <Link
            href="/reports"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            View reports
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {evidence.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-950">
                    {file.file_name || "Evidence file"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatEvidenceType(file.evidence_type)}
                    {" · "}
                    {new Date(
                      file.created_at
                    ).toLocaleString()}
                  </p>

                  {file.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {file.description}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-400">
                    Report: {file.report_title}
                  </p>

                  {file.uploader && (
                    <p className="mt-1 text-xs text-slate-400">
                      Uploaded by {file.uploader.username}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${verificationBadgeClass(
                      file.verification_status
                    )}`}
                  >
                    {file.verification_status}
                  </span>

                  {file.file_url && (
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      Open evidence
                    </a>
                  )}

                  <Link
                    href={`/reports/${file.report_id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    View report →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}