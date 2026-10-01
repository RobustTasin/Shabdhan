"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEvidence, type EvidenceFile } from "../lib/reports";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);

  useEffect(() => {
    setEvidence(getEvidence());
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

      {evidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No evidence yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add evidence from a report's details page.
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
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {file.type} · {formatFileSize(file.size)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Report: {file.reportTitle}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">
                    {file.uploadedAt}
                  </span>

                  <Link
                    href={`/reports/${file.reportId}`}
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
