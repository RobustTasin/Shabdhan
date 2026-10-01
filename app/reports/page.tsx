"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultReports,
  getReports,
  saveReports,
  type Report,
} from "../lib/reports";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(defaultReports);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");

  useEffect(() => {
    setReports(getReports());
  }, []);

  function createReport() {
    if (!title.trim()) return;

    const newReport: Report = {
      id: Date.now(),
      title: title.trim(),
      category,
      status: "Draft",
      updated: "Just now",
    };

    const updatedReports = [newReport, ...reports];

    setReports(updatedReports);
    saveReports(updatedReports);

    setTitle("");
    setCategory("General");
    setShowCreate(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Shabdhan</p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Reports
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Create, review, and manage your reports.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            + Create report
          </button>
        </div>

        <section className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold">My reports</h2>

              <p className="mt-1 text-xs text-slate-500">
                {reports.length} report{reports.length === 1 ? "" : "s"}
              </p>
            </div>

            {reports.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No reports yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first report to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {report.title}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{report.category}</span>
                        <span>•</span>
                        <span>Updated {report.updated}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                          report.status === "Draft"
                            ? "bg-slate-100 text-slate-700"
                            : report.status === "Under review"
                              ? "bg-amber-50 text-amber-700"
                              : report.status === "Verified"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                        }`}
                      >
                        {report.status}
                      </span>

                      <span className="text-slate-400">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Create a report
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Start a new verification report.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Report title
                  </label>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter a report title"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option>General</option>
                    <option>Identity</option>
                    <option>Document</option>
                    <option>Transaction</option>
                    <option>Content</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={createReport}
                  disabled={!title.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
