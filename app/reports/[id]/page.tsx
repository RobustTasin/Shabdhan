"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import {
  getDisputes,
  getEvidence,
  getReports,
  saveDisputes,
  saveEvidence,
  saveReports,
  type Dispute,
  type EvidenceFile,
  type Report,
} from "../../lib/reports";
import { addNotification } from "../../lib/notifications";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(file: File) {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("image/")) return "IMAGE";
  return "FILE";
}

export default function ReportDetailsPage() {
  const params = useParams();
  const id = Number(params.id);

  const [report, setReport] = useState<Report | null>(null);
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [existingDispute, setExistingDispute] =
    useState<Dispute | null>(null);

  useEffect(() => {
    const reports = getReports();
    const found = reports.find((item) => item.id === id);

    setReport(found ?? null);

    const allEvidence = getEvidence();
    setEvidence(
      allEvidence.filter((item) => item.reportId === id)
    );

    const disputes = getDisputes();
    const dispute = disputes.find((item) => item.reportId === id);

    setExistingDispute(dispute ?? null);
  }, [id]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!report) return;

    const files = Array.from(event.target.files ?? []);

    const newEvidence: EvidenceFile[] = files.map((file) => ({
      id: Date.now() + Math.random(),
      reportId: report.id,
      reportTitle: report.title,
      name: file.name,
      size: file.size,
      type: getFileType(file),
      uploadedAt: "Just now",
    }));

    const allEvidence = getEvidence();
    const updatedEvidence = [...allEvidence, ...newEvidence];

    saveEvidence(updatedEvidence);

    setEvidence((current) => [...current, ...newEvidence]);

    event.target.value = "";
  }

  function removeEvidence(fileId: number) {
    const allEvidence = getEvidence();

    const updatedEvidence = allEvidence.filter(
      (file) => file.id !== fileId
    );

    saveEvidence(updatedEvidence);

    setEvidence((current) =>
      current.filter((file) => file.id !== fileId)
    );
  }

  function handleUpload() {
    if (evidence.length === 0) return;

    setUploading(true);

    setTimeout(() => {
      setUploading(false);
    }, 1000);
  }

  function handleSubmitForReview() {
    if (!report || report.status !== "Draft") return;

    const updatedReport: Report = {
      ...report,
      status: "Under review",
      updated: "Just now",
    };

    const reports = getReports();

    const updatedReports = reports.map((item) =>
      item.id === updatedReport.id ? updatedReport : item
    );

    saveReports(updatedReports);
    setReport(updatedReport);

    addNotification({
      title: "Report submitted for review",
      message: `"${report.title}" has been submitted and is now under review.`,
      createdAt: "Just now",
      href: `/reports/${report.id}`,
    });
  }

  function handleOpenDispute() {
    if (!report) return;
    if (report.status === "Disputed") return;

    setDisputeReason("");
    setShowDisputeModal(true);
  }

  function handleCloseDispute() {
    if (disputeSubmitting) return;

    setShowDisputeModal(false);
    setDisputeReason("");
  }

  function handleSubmitDispute() {
    if (!report) return;

    const reason = disputeReason.trim();

    if (!reason) return;

    setDisputeSubmitting(true);

    const disputes = getDisputes();

    const existing = disputes.find(
      (item) => item.reportId === report.id
    );

    if (existing) {
      setExistingDispute(existing);
      setDisputeSubmitting(false);
      setShowDisputeModal(false);
      setDisputeReason("");
      return;
    }

    const newDispute: Dispute = {
      id: Date.now(),
      reportId: report.id,
      reportTitle: report.title,
      reason,
      createdAt: "Just now",
      status: "Open",
    };

    const updatedDisputes = [
      newDispute,
      ...disputes.filter(
        (item) => item.reportId !== report.id
      ),
    ];

    saveDisputes(updatedDisputes);

    const updatedReport: Report = {
      ...report,
      status: "Disputed",
      updated: "Just now",
    };

    const reports = getReports();

    const updatedReports = reports.map((item) =>
      item.id === updatedReport.id ? updatedReport : item
    );

    saveReports(updatedReports);

    setReport(updatedReport);
    setExistingDispute(newDispute);

    addNotification({
      title: "Dispute submitted",
      message: `"${report.title}" has been disputed and is now under review.`,
      createdAt: "Just now",
      href: `/disputes/${newDispute.id}`,
    });

    setDisputeSubmitting(false);
    setShowDisputeModal(false);
    setDisputeReason("");
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Link
          href="/reports"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to reports
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-slate-950">
            Report not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The report you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  const canSubmit = report.status === "Draft";

  const canDispute =
    report.status === "Under review" &&
    !existingDispute;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to reports
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Report #{report.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {report.title}
            </h1>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${
              report.status === "Draft"
                ? "bg-slate-100 text-slate-700"
                : report.status === "Under review"
                  ? "bg-amber-100 text-amber-800"
                  : report.status === "Verified"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {report.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Report details
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Title
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {report.title}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Category
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {report.category}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {report.status}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Last updated
              </p>

              <p className="mt-1 text-sm text-slate-900">
                {report.updated}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Report actions
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage the review status of this report.
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={!canSubmit}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                canSubmit
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              {canSubmit
                ? "Submit for review"
                : "Submitted for review"}
            </button>

            {report.status === "Under review" && (
              <button
                type="button"
                onClick={handleOpenDispute}
                disabled={!canDispute}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  canDispute
                    ? "border-red-300 text-red-700 hover:bg-red-50"
                    : "cursor-not-allowed border-slate-200 text-slate-400"
                }`}
              >
                {existingDispute
                  ? "Dispute submitted"
                  : "Dispute report"}
              </button>
            )}

            {existingDispute && (
              <Link
                href={`/disputes/${existingDispute.id}`}
                className="block rounded-lg bg-red-50 p-3 text-sm text-red-800 hover:bg-red-100"
              >
                <p className="font-medium">
                  Dispute submitted
                </p>

                <p className="mt-1 text-xs">
                  Status: {existingDispute.status}
                </p>

                <p className="mt-2 text-xs font-medium">
                  View dispute →
                </p>
              </Link>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Evidence
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add documents or images that support this report.
            </p>
          </div>

          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Add evidence

            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {evidence.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500">
              No evidence added yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {evidence.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {file.type} · {formatFileSize(file.size)} ·{" "}
                    {file.uploadedAt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeEvidence(file.id)}
                  className="ml-4 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload evidence"}
            </button>
          </div>
        )}
      </section>

      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Dispute report
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Explain why you believe this report should be
                  disputed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDispute}
                disabled={disputeSubmitting}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor="dispute-reason"
                className="text-sm font-medium text-slate-700"
              >
                Reason
              </label>

              <textarea
                id="dispute-reason"
                value={disputeReason}
                onChange={(event) =>
                  setDisputeReason(event.target.value.slice(0, 500))
                }
                placeholder="Describe the issue with this report..."
                rows={5}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-1 text-xs text-slate-400">
                {disputeReason.trim().length}/500 characters
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDispute}
                disabled={disputeSubmitting}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={
                  disputeSubmitting ||
                  disputeReason.trim().length === 0
                }
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disputeSubmitting
                  ? "Submitting..."
                  : "Submit dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
