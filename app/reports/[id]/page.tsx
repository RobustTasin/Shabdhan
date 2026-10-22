"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import PublicSiteHeader from "../../components/PublicSiteHeader";
import { type FormEvent, useEffect, useState } from "react";

import {
  getEvidenceForReport,
  deleteEvidence,
  updateEvidenceVerification,
  addEvidenceLink,
  findAndAttachArchivedCopy,
  uploadEvidence,
  type Evidence,
  type VerificationStatus,
} from "../../lib/evidence-api";
import {
  getReport,
  editReport,
  updateReportVerification,
  unpublishReport,
  deleteReport,
  searchReports,
  reportStatusLabel,
  type ApiReport,
} from "../../lib/reports-api";
import {
  createComment,
  deleteComment,
  getCommentsForReport,
  updateComment,
  type ApiComment,
} from "../../lib/comments-api";
import {
  createCorroboration,
  deleteCorroboration,
  getCorroborationsForReport,
  type ApiCorroboration,
} from "../../lib/corroborations-api";
import { formatPublicReportId } from "../../../shared/report-id";

const MAX_DIRECT_EVIDENCE_BYTES = 12 * 1024 * 1024;
const SUPPORTED_DIRECT_EVIDENCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function formatFileSizeFromType(file: File) {
  const bytes = file.size;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getEvidenceFileError(file: File) {
  if (!SUPPORTED_DIRECT_EVIDENCE_TYPES.has(file.type)) {
    return `${file.name}: choose a JPG, PNG, WebP, or PDF file.`;
  }
  return "";
}

function formatEvidenceType(type: Evidence["evidence_type"]) {
  switch (type) {
    case "IMAGE":
      return "Image";
    case "VIDEO":
      return "Video";
    case "DOCUMENT":
      return "Document";
    case "LINK":
      return "Link";
    default:
      return "Other";
  }
}

function verificationBadgeClass(
  status: Evidence["verification_status"]
) {
  switch (status) {
    case "VERIFIED":
      return "bg-teal-100 text-teal-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const canReviewEvidence = user?.role === "MODERATOR" || user?.role === "ADMIN";

  const [report, setReport] = useState<ApiReport | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [editReportError, setEditReportError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [moderationReason, setModerationReason] = useState("");

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceActionError, setEvidenceActionError] = useState("");
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);
  const [reviewingEvidenceId, setReviewingEvidenceId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const usedDirectEvidenceBytes = evidence.reduce((total, item) => {
    if (item.evidence_type !== "IMAGE" && item.evidence_type !== "DOCUMENT") return total;
    return total + (Number(item.file_size_bytes) || 0);
  }, 0);
  const selectedEvidenceBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
  const exceedsEvidenceBudget = usedDirectEvidenceBytes + selectedEvidenceBytes > MAX_DIRECT_EVIDENCE_BYTES;
  const [description, setDescription] = useState("");

  const [uploading, setUploading] = useState(false);
  const [addingEvidenceLink, setAddingEvidenceLink] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [evidenceLinkError, setEvidenceLinkError] = useState("");
  const [evidenceLinkSuccess, setEvidenceLinkSuccess] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceLinkDescription, setEvidenceLinkDescription] = useState("");
  const [checkingArchive, setCheckingArchive] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [archiveMessageError, setArchiveMessageError] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [corroborations, setCorroborations] = useState<ApiCorroboration[]>([]);
  const [corroborationsLoading, setCorroborationsLoading] = useState(true);
  const [corroborationComment, setCorroborationComment] = useState("");
  const [submittingCorroboration, setSubmittingCorroboration] = useState(false);
  const [corroborationActionError, setCorroborationActionError] = useState("");
  const [corroborationActionSuccess, setCorroborationActionSuccess] = useState("");
  const [relatedReports, setRelatedReports] = useState<ApiReport[]>([]);
  const [relatedReportsLoading, setRelatedReportsLoading] = useState(true);

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentActionError, setCommentActionError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    void Promise.all([
      getReport(id),
      getEvidenceForReport(id),
      getCommentsForReport(id),
      getCorroborationsForReport(id),
    ])
      .then(
        ([reportResponse, evidenceResponse, commentsResponse, corroborationsResponse]) => {
          setReport(reportResponse.report);
          setEditTitle(reportResponse.report.title);
          setEditDescription(reportResponse.report.description);
          setEvidence(evidenceResponse.evidence);
          setComments(commentsResponse.comments);
          setCorroborations(corroborationsResponse.corroborations);

        }
      )
      .catch((err) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load report";

        setError(message);
      })
      .finally(() => {
        setLoading(false);
        setEvidenceLoading(false);
        setCommentsLoading(false);
        setCorroborationsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!report?.social_account_id) return;
    let cancelled = false;
    setRelatedReportsLoading(true);
    void searchReports({ page: 1, limit: 12, socialAccountId: report.social_account_id })
      .then((response) => {
        if (!cancelled) {
          setRelatedReports(response.reports.filter((item) => item.id !== report.id));
        }
      })
      .catch(() => {
        if (!cancelled) setRelatedReports([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [report?.id, report?.social_account_id]);

  async function handleReportReview(
    verificationStatus: "VERIFIED" | "REJECTED"
  ) {
    if (!id || reviewing) {
      return;
    }

    setReviewing(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      const response = await updateReportVerification(
        id,
        verificationStatus,
        verificationStatus === "REJECTED" ? moderationReason.trim() : undefined
      );
      setReport((current) =>
        current
          ? {
              ...current,
              status: response.report.status,
              verification_status: response.report.verification_status,
              updated_at: response.report.updated_at,
              published_at: response.report.published_at,
            }
          : current
      );
      setReviewSuccess(
        verificationStatus === "VERIFIED"
          ? response.report.status === "PUBLISHED"
            ? "Report verified and published."
            : "Report verified."
          : "Report rejected."
      );
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Failed to update report review."
      );
    } finally {
      setReviewing(false);
    }
  }

  async function handleUnpublishReport() {
    if (!id || reviewing) return;
    setReviewing(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      const response = await unpublishReport(id, moderationReason.trim() || undefined);
      setReport((current) => current ? { ...current, status: response.report.status, published_at: null, updated_at: response.report.updated_at } : current);
      setReviewSuccess("Report unpublished.");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to unpublish report.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleDeleteReport() {
    if (!id || reviewing || !window.confirm("Permanently delete this report and its evidence, comments, and related records? This cannot be undone.")) return;
    setReviewing(true);
    setReviewError("");
    try {
      await deleteReport(id);
      router.push("/reports");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to delete report.");
      setReviewing(false);
    }
  }

  async function handleUpload() {
    if (!id || selectedFiles.length === 0) {
      setUploadError("Please select one or more evidence files.");
      return;
    }

    const invalidFile = selectedFiles.find((file) => getEvidenceFileError(file));
    if (invalidFile) {
      setUploadError(getEvidenceFileError(invalidFile));
      return;
    }
    if (usedDirectEvidenceBytes + selectedFiles.reduce((total, file) => total + file.size, 0) > MAX_DIRECT_EVIDENCE_BYTES) {
      setUploadError("All files uploaded directly to Shabdhan may total 12 MB per report. Remove files or delete existing uploads to continue.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const uploaded: Evidence[] = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        try {
          const response = await uploadEvidence(id, selectedFiles[index], description);
          uploaded.push(response.evidence);
        } catch (err) {
          if (uploaded.length) setEvidence((current) => [...uploaded.reverse(), ...current]);
          setSelectedFiles(selectedFiles.slice(index));
          const reason = err instanceof Error ? err.message : "Upload failed";
          setUploadError(`Uploaded ${uploaded.length} of ${selectedFiles.length} files. ${selectedFiles[index].name}: ${reason}`);
          return;
        }
      }

      setEvidence((current) => [...uploaded.reverse(), ...current]);
      setSelectedFiles([]);
      setDescription("");
      setUploadSuccess(`${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"} uploaded successfully.`);

      const fileInput = document.getElementById(
        "evidence-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Failed to upload evidence"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleAddEvidenceLink() {
    if (!id || !evidenceUrl.trim() || addingEvidenceLink) return;
    setAddingEvidenceLink(true);
    setEvidenceLinkError("");
    setEvidenceLinkSuccess("");
    try {
      const response = await addEvidenceLink(id, evidenceUrl.trim(), {
        label: evidenceLabel.trim() || undefined,
        description: evidenceLinkDescription.trim() || undefined,
      });
      setEvidence((current) => [response.evidence, ...current]);
      setEvidenceUrl("");
      setEvidenceLabel("");
      setEvidenceLinkDescription("");
      setEvidenceLinkSuccess("Evidence link added. Anyone viewing this public report can open it.");
    } catch (err) {
      setEvidenceLinkError(err instanceof Error ? err.message : "Failed to add evidence link.");
    } finally {
      setAddingEvidenceLink(false);
    }
  }

  async function handleDeleteEvidence(item: Evidence) {
    if (
      deletingEvidenceId || reviewingEvidenceId ||
      !window.confirm(`Permanently delete “${item.file_name || "Evidence file"}”? This cannot be undone.`)
    ) return;

    setDeletingEvidenceId(item.id);
    setEvidenceActionError("");
    try {
      await deleteEvidence(item.id);
      setEvidence((current) => current.filter((evidenceItem) => evidenceItem.id !== item.id));
    } catch (err) {
      setEvidenceActionError(err instanceof Error ? err.message : "Failed to delete evidence.");
    } finally {
      setDeletingEvidenceId(null);
    }
  }

  async function handleUpdateEvidenceVerification(
    item: Evidence,
    verificationStatus: VerificationStatus
  ) {
    if (reviewingEvidenceId || deletingEvidenceId) return;
    if (
      verificationStatus === "REJECTED" &&
      !window.confirm("Reject this evidence? The uploader will be notified.")
    ) return;

    setReviewingEvidenceId(item.id);
    setEvidenceActionError("");
    try {
      const response = await updateEvidenceVerification(item.id, verificationStatus);
      setEvidence((current) => current.map((evidenceItem) =>
        evidenceItem.id === item.id
          ? { ...evidenceItem, ...response.evidence }
          : evidenceItem
      ));
    } catch (err) {
      setEvidenceActionError(err instanceof Error ? err.message : "Failed to update evidence status.");
    } finally {
      setReviewingEvidenceId(null);
    }
  }

  async function handleCheckArchive() {
    if (!id || !evidenceUrl.trim() || checkingArchive) return;
    setCheckingArchive(true);
    setArchiveMessage("");
    setArchiveMessageError(false);
    try {
      const response = await findAndAttachArchivedCopy(id, evidenceUrl.trim());
      if (response.evidence) {
        setEvidence((current) => current.some((item) => item.id === response.evidence?.id)
          ? current
          : [response.evidence!, ...current]);
      }
      setArchiveMessage(response.message);
    } catch (err) {
      setArchiveMessageError(true);
      setArchiveMessage(err instanceof Error ? err.message : "Failed to check for an archived copy.");
    } finally {
      setCheckingArchive(false);
    }
  }

  async function handleShareReport() {
    if (!report) return;
    const url = window.location.href;
    const publicReportId = formatPublicReportId(
      report.public_report_category_code,
      report.public_report_number
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, text: `Report ID: ${publicReportId}`, url });
        setShareMessage("Share menu opened.");
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Report link copied.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareMessage("Could not share automatically. Copy the page URL from your browser.");
    }
  }

  async function handleCopyReportId() {
    if (!report) return;
    const publicReportId = formatPublicReportId(
      report.public_report_category_code,
      report.public_report_number
    );
    try {
      await navigator.clipboard.writeText(publicReportId);
      setShareMessage("Report ID copied.");
    } catch {
      setShareMessage(`Report ID: ${publicReportId}`);
    }
  }

  async function refreshCorroborations() {
    if (!id) {
      return;
    }

    const response = await getCorroborationsForReport(id);
    setCorroborations(response.corroborations);
  }

  async function handleCreateCorroboration() {
    if (!id || !user || submittingCorroboration) {
      return;
    }

    setSubmittingCorroboration(true);
    setCorroborationActionError("");
    setCorroborationActionSuccess("");

    try {
      await createCorroboration({
        report_id: id,
        comment: corroborationComment.trim() || undefined,
      });

      await refreshCorroborations();
      setCorroborationComment("");
      setCorroborationActionSuccess(
        "Your corroboration was added successfully."
      );
    } catch (err) {
      setCorroborationActionError(
        err instanceof Error
          ? err.message
          : "Failed to add corroboration"
      );
    } finally {
      setSubmittingCorroboration(false);
    }
  }

  async function handleDeleteCorroboration(corroborationId: string) {
    if (submittingCorroboration) {
      return;
    }

    setSubmittingCorroboration(true);
    setCorroborationActionError("");
    setCorroborationActionSuccess("");

    try {
      await deleteCorroboration(corroborationId);
      await refreshCorroborations();
      setCorroborationActionSuccess("Your corroboration was removed.");
    } catch (err) {
      setCorroborationActionError(
        err instanceof Error
          ? err.message
          : "Failed to remove corroboration"
      );
    } finally {
      setSubmittingCorroboration(false);
    }
  }


  async function handleCreateComment() {
    if (!id || !commentText.trim()) {
      return;
    }

    setSubmittingComment(true);
    setCommentActionError("");

    try {
      const response = await createComment({
        report_id: id,
        content: commentText.trim(),
      });

      setComments((current) => [...current, response.comment]);
      setCommentText("");
    } catch (err) {
      setCommentActionError(
        err instanceof Error
          ? err.message
          : "Failed to post comment"
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleCreateReply(parentCommentId: string) {
    if (!id || !replyText.trim()) {
      return;
    }

    setSubmittingComment(true);
    setCommentActionError("");

    try {
      const response = await createComment({
        report_id: id,
        parent_comment_id: parentCommentId,
        content: replyText.trim(),
      });

      setComments((current) => [...current, response.comment]);
      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      setCommentActionError(
        err instanceof Error
          ? err.message
          : "Failed to post reply"
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editingText.trim()) {
      return;
    }

    setSubmittingComment(true);
    setCommentActionError("");

    try {
      const response = await updateComment(
        commentId,
        editingText.trim()
      );

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? response.comment : comment
        )
      );

      setEditingCommentId(null);
      setEditingText("");
    } catch (err) {
      setCommentActionError(
        err instanceof Error
          ? err.message
          : "Failed to update comment"
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setSubmittingComment(true);
    setCommentActionError("");

    try {
      await deleteComment(commentId);

      setComments((current) =>
        current.filter(
          (comment) =>
            comment.id !== commentId &&
            comment.parent_comment_id !== commentId
        )
      );
    } catch (err) {
      setCommentActionError(
        err instanceof Error
          ? err.message
          : "Failed to delete comment"
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <>
        <PublicSiteHeader />
        <div className="p-8 text-sm text-slate-500">Loading report...</div>
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <PublicSiteHeader />
        <div className="space-y-4 p-6 lg:p-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Back to feed
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-semibold text-red-950">
              Report not found
            </h1>

            <p className="mt-2 text-sm text-red-800">
              {error || "The report does not exist."}
            </p>
          </div>
        </div>
      </>
    );
  }

  const isReportOwner = Boolean(user && user.id === report.reporter?.id);
  const canAddEvidence = isReportOwner;

  async function handleEditReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report || !isReportOwner || savingReport) return;
    setSavingReport(true);
    setEditReportError("");
    try {
      const response = await editReport(report.id, { title: editTitle, description: editDescription });
      setReport((current) => current ? { ...current, ...response.report, reporter: current.reporter } : current);
      setEditingReport(false);
      setReviewSuccess(response.message);
    } catch (err) {
      setEditReportError(err instanceof Error ? err.message : "Could not update this report.");
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <>
      <PublicSiteHeader />
      <div className="space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to feed
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                Report ID: {formatPublicReportId(report.public_report_category_code, report.public_report_number)}
              </p>
              <button type="button" onClick={() => void handleCopyReportId()} className="text-xs font-semibold text-teal-800 underline underline-offset-2">Copy ID</button>
            </div>

            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {report.title}
            </h1>
            {shareMessage && <p role="status" className="mt-2 text-xs text-teal-700">{shareMessage}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {reportStatusLabel(report.status, report.verification_status)}
            </span>
            <button type="button" onClick={() => void handleShareReport()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Share report</button>
            {isReportOwner && <button type="button" onClick={() => { setEditTitle(report.title); setEditDescription(report.description); setEditReportError(""); setEditingReport((open) => !open); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{editingReport ? "Cancel edit" : "Edit report"}</button>}
          </div>
        </div>
      </div>

      {editingReport && isReportOwner && (
        <form onSubmit={(event) => void handleEditReport(event)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="font-semibold text-slate-950">Edit report</h2>
            <p className="mt-1 text-sm text-slate-600">Saving changes will unpublish this report and send it back to moderators for review.</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">Title
            <input required maxLength={255} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Description
            <textarea required rows={5} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
          {editReportError && <p role="alert" className="text-sm text-red-700">{editReportError}</p>}
          <button type="submit" disabled={savingReport || !editTitle.trim() || !editDescription.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{savingReport ? "Saving…" : "Save and send for review"}</button>
        </form>
      )}

      {(user?.role === "MODERATOR" || user?.role === "ADMIN") && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-950">Moderator review</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current verification status: {report.verification_status}
              </p>
            </div>
            <label className="block max-w-2xl text-sm text-slate-600">
              Optional cause for unpublishing or rejection
              <textarea
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                maxLength={1000}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Add context for the reporter and audit record"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleReportReview("VERIFIED")} disabled={reviewing || (report.verification_status === "VERIFIED" && report.status === "PUBLISHED")} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                {reviewing ? "Saving..." : report.status === "RESOLVED" ? "Verify" : "Verify and publish"}
              </button>
              <button type="button" onClick={() => void handleUnpublishReport()} disabled={reviewing || report.status !== "PUBLISHED"} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">
                Unpublish
              </button>
              <button type="button" onClick={() => void handleReportReview("REJECTED")} disabled={reviewing || report.verification_status === "REJECTED"} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                Reject
              </button>
              {user?.role === "ADMIN" && (
                <button type="button" onClick={() => void handleDeleteReport()} disabled={reviewing} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
                  Delete report
                </button>
              )}
            </div>
          </div>
          {reviewError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {reviewError}
            </p>
          )}
          {reviewSuccess && (
            <p role="status" className="mt-3 text-sm text-teal-700">
              {reviewSuccess}
            </p>
          )}
        </section>
      )}

      <div className="report-detail-layout">
      <div className="report-detail-overview space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Report details
          </h2>

          <div className="mt-6 space-y-6">
            {report.reporter?.username && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Created by</p>
                <Link href={`/users/${report.reporter.id}`} className="mt-1 inline-flex text-sm font-medium text-slate-900 hover:text-teal-800 hover:underline">@{report.reporter.username}</Link>
              </div>
            )}
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Category
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {report.category?.name ?? "Uncategorized"}
                </p>
              </div>

              {report.location_country_name && <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{report.incident_type === "OFFLINE" ? "Incident location" : "Reported entity location"}</p>
                <p className="mt-1 text-sm text-slate-900">{[report.location_area, report.location_city_corporation, report.location_sub_district, report.location_district, report.location_division, report.location_country_name].filter(Boolean).join(" · ")}</p>
              </div>}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {new Date(
                    report.created_at
                  ).toLocaleString()}
                </p>
              </div>

            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last updated</p>
              <p className="mt-1 text-sm text-slate-900">{new Date(report.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </section>

        {report.social_account?.id && <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Reported Entity
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Platform
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {report.social_account?.platform}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Username
              </p>

              <p className="mt-1 text-sm text-slate-900">
                @{report.social_account?.username}
              </p>
            </div>

            {report.social_account?.display_name && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Display name
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {report.social_account.display_name}
                </p>
              </div>
            )}

            {report.social_account?.profile_url && (
              <a
                href={report.social_account.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-slate-700 underline"
              >
                Open profile
              </a>
            )}
          </div>
        </section>
        </aside>}
      </div>

      <section aria-labelledby="report-description-title" className="report-detail-description rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="report-description-title" className="text-base font-semibold text-slate-950">Description</h2>
        <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 ${descriptionExpanded ? "" : "line-clamp-3"}`}>{report.description}</p>
        {report.description.length > 220 && <button type="button" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="mt-2 text-sm font-semibold text-teal-800 underline underline-offset-2">{descriptionExpanded ? "Show less" : "Read full description"}</button>}
      </section>

      <section id="evidence" className="report-detail-evidence scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Evidence and source links</h2>
        </div>

        {canAddEvidence ? (
        <div className="report-evidence-forms mt-5 space-y-6">
          <div className="report-evidence-link-form space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Add a cloud folder or web link</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Paste a Google Drive, OneDrive, Proton Drive, or public webpage link. Set cloud files to “Anyone with the link can view.” Shabdhan stores the link and does not change the provider’s sharing permissions.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="evidence-url" className="text-sm font-medium text-slate-700">View link</label>
                <input id="evidence-url" type="url" value={evidenceUrl} onChange={(event) => { setEvidenceUrl(event.target.value); setArchiveMessage(""); }} placeholder="https://…" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
              <div>
                <label htmlFor="evidence-label" className="text-sm font-medium text-slate-700">Link label</label>
                <input id="evidence-label" value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} maxLength={255} placeholder="Evidence folder or archived copy" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
            </div>
            <label htmlFor="evidence-link-description" className="mt-4 block text-sm font-medium text-slate-700">What does this link contain? <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea id="evidence-link-description" value={evidenceLinkDescription} onChange={(event) => setEvidenceLinkDescription(event.target.value)} maxLength={1000} rows={2} placeholder="Briefly describe the material" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void handleAddEvidenceLink()} disabled={addingEvidenceLink || !evidenceUrl.trim()} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{addingEvidenceLink ? "Adding link…" : "Add public link"}</button>
              {evidenceUrl.trim().startsWith("https://") && (
                <>
                  <button type="button" onClick={() => void handleCheckArchive()} disabled={checkingArchive} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60">{checkingArchive ? "Checking archive…" : "Find and attach saved copy"}</button>
                  <a href={`https://web.archive.org/save/${evidenceUrl.trim()}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-800 underline underline-offset-2">Save with Internet Archive ↗</a>
                </>
              )}
            </div>
            {evidenceLinkError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{evidenceLinkError}</p>}
            {evidenceLinkSuccess && <p role="status" className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{evidenceLinkSuccess}</p>}
            {archiveMessage && <p role={archiveMessageError ? "alert" : "status"} className={`mt-3 text-sm ${archiveMessageError ? "text-red-700" : "text-teal-800"}`}>{archiveMessage}</p>}
            <p className="mt-3 text-xs leading-5 text-slate-500">Shabdhan can find and attach an existing Internet Archive snapshot. If none exists, save the public page with the Archive and check again. The snapshot is hosted by the Internet Archive, not copied onto Shabdhan, and capture is not guaranteed for every page.</p>
          </div>

          <div className="report-evidence-upload-form space-y-3">
          <h3 className="text-sm font-semibold text-slate-950">
            Or upload a file to Shabdhan
          </h3>
          <p className="mt-1 text-xs text-slate-600">JPG, PNG, WebP, or PDF · 12 MB total per report · no file count limit</p>
          <p className="mt-1 text-xs text-slate-500">{formatFileSizeFromType({ size: Math.max(0, MAX_DIRECT_EVIDENCE_BYTES - usedDirectEvidenceBytes) } as File)} remaining</p>

          <div className="mt-3 space-y-4">
            <div>
              <label
                htmlFor="evidence-file"
                className="text-sm font-medium text-slate-700"
              >
                Evidence file
              </label>

              <input
                id="evidence-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setSelectedFiles(files);
                  setUploadError("");
                  setUploadSuccess("");
                  const invalidFile = files.find((file) => getEvidenceFileError(file));
                  if (invalidFile) setUploadError(getEvidenceFileError(invalidFile));
                  else if (usedDirectEvidenceBytes + files.reduce((total, file) => total + file.size, 0) > MAX_DIRECT_EVIDENCE_BYTES) setUploadError("Selected files and existing uploads exceed the 12 MB total per report.");
                }}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
              />

              {selectedFiles.length > 0 && <ul className="mt-2 space-y-1 text-xs text-slate-500">{selectedFiles.map((file) => <li key={`${file.name}-${file.lastModified}-${file.size}`} className={getEvidenceFileError(file) ? "text-red-700" : ""}>{file.name} · {formatFileSizeFromType(file)}</li>)}</ul>}
              {selectedFiles.length > 0 && <p className={`mt-1 text-xs ${exceedsEvidenceBudget ? "text-red-700" : "text-slate-500"}`}>Selected: {formatFileSizeFromType({ size: selectedEvidenceBytes } as File)} / {formatFileSizeFromType({ size: Math.max(0, MAX_DIRECT_EVIDENCE_BYTES - usedDirectEvidenceBytes) } as File)} remaining</p>}
            </div>

            <div>
              <label
                htmlFor="evidence-description"
                className="text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="evidence-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                placeholder="Explain what this evidence shows..."
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                {uploadSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0 || exceedsEvidenceBudget || selectedFiles.some((file) => Boolean(getEvidenceFileError(file)))}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : selectedFiles.length > 1 ? `Upload ${selectedFiles.length} files` : "Upload evidence"}
            </button>
          </div>
        </div>
        </div>
        ) : !user ? (
          <div className="mt-5">
            <p className="text-sm text-slate-700">Only the report creator can add evidence. If you created this report, sign in to continue.</p>
            <Link href={`/login?next=${encodeURIComponent(`/reports/${id}#evidence`)}`} className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800">Sign in as report creator</Link>
          </div>
        ) : !canAddEvidence ? (
          <p className="mt-5 text-sm text-slate-700">Only the report creator can add evidence.</p>
        ) : null}

        <div className="report-evidence-list mt-6">
          {evidenceActionError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {evidenceActionError}
            </p>
          )}

          {evidenceLoading ? (
            <p className="text-sm text-slate-500">
              Loading evidence...
            </p>
          ) : evidenceError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {evidenceError}
            </div>
          ) : evidence.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No evidence has been added yet.
              </p>

              <p className="mt-1 text-xs text-slate-500">Evidence links and uploaded files appear here when available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-950">
                        {item.file_name || "Evidence file"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatEvidenceType(item.evidence_type)}
                        {" · "}
                        {new Date(
                          item.created_at
                        ).toLocaleString()}
                      </p>

                      {item.description && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {item.description}
                        </p>
                      )}

                    </div>

                    <div className="flex flex-col items-start gap-2">
                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${verificationBadgeClass(
                          item.verification_status
                        )}`}
                      >
                        {item.verification_status}
                      </span>

                      {canReviewEvidence && (
                        <div className="flex flex-wrap gap-2">
                          {item.verification_status !== "VERIFIED" && (
                            <button
                              type="button"
                              onClick={() => void handleUpdateEvidenceVerification(item, "VERIFIED")}
                              disabled={reviewingEvidenceId !== null || deletingEvidenceId !== null}
                              className="rounded-md border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {reviewingEvidenceId === item.id ? "Saving…" : "Verify"}
                            </button>
                          )}
                          {item.verification_status !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => void handleUpdateEvidenceVerification(item, "REJECTED")}
                              disabled={reviewingEvidenceId !== null || deletingEvidenceId !== null}
                              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {reviewingEvidenceId === item.id ? "Saving…" : "Reject"}
                            </button>
                          )}
                          {item.verification_status !== "PENDING" && (
                            <button
                              type="button"
                              onClick={() => void handleUpdateEvidenceVerification(item, "PENDING")}
                              disabled={reviewingEvidenceId !== null || deletingEvidenceId !== null}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {reviewingEvidenceId === item.id ? "Saving…" : "Mark pending"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.evidence_type === "IMAGE" && item.file_url && (
                    <button type="button" onClick={() => setSelectedEvidenceImage(item.file_url)} aria-label={`View full-size evidence image: ${item.file_name || "uploaded image"}`} className="mt-4 block max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                      <img src={item.file_url} alt={item.description || item.file_name || "Report evidence"} loading="lazy" className="max-h-[32rem] max-w-full object-contain" />
                      <span className="block px-3 py-2 text-xs font-medium text-teal-800">Click to view full size</span>
                    </button>
                  )}

                  {item.file_url && item.evidence_type !== "IMAGE" && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-slate-700 underline"
                    >
                      Open evidence
                    </a>
                  )}

                  {user && (
                    user.id === report?.reporter_id || user.role === "ADMIN"
                  ) && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvidence(item)}
                      disabled={deletingEvidenceId !== null}
                      className="mt-4 ml-4 inline-block text-sm font-medium text-red-700 underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingEvidenceId === item.id ? "Deleting…" : "Delete evidence"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="report-detail-interactions">
      <section id="corroborations" className="report-detail-corroborations scroll-mt-24 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Corroborations</h2>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">{corroborations.length}</span>
        </div>

        {report.social_account_id && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Other reports about this subject</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">Each report has its own ID and review. Reports are grouped here because they reference the same account or entity.</p>
            </div>
            <Link
              href={user
                ? `/create-report?social_account_id=${encodeURIComponent(report.social_account_id)}`
                : `/login?next=${encodeURIComponent(`/create-report?social_account_id=${report.social_account_id}`)}`}
              className="inline-flex shrink-0 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
            >
              Add another report
            </Link>
          </div>
          {relatedReportsLoading ? (
            <p className="mt-4 text-xs text-slate-500">Looking for related public reports…</p>
          ) : relatedReports.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {relatedReports.slice(0, 6).map((relatedReport) => (
                <Link key={relatedReport.id} href={`/reports/${relatedReport.id}`} className="rounded-lg border border-indigo-100 bg-white p-3 transition hover:border-indigo-300">
                  <span className="block text-sm font-medium text-slate-900">{relatedReport.title}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Report ID: {formatPublicReportId(relatedReport.public_report_category_code, relatedReport.public_report_number)} · {new Date(relatedReport.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">No other published reports about this subject yet. A new report will appear here after it has been reviewed and published.</p>
          )}
        </div>
        )}

        {user && user.id !== report.reporter?.id ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-950">
              Corroborate this report
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Confirm that you support the report. A comment is optional.
            </p>

            <textarea
              value={corroborationComment}
              onChange={(event) => {
                setCorroborationComment(event.target.value);
                setCorroborationActionError("");
                setCorroborationActionSuccess("");
              }}
              rows={3}
              placeholder="Add context about why you corroborate this report (optional)..."
              disabled={submittingCorroboration}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            />

            {corroborationActionError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {corroborationActionError}
              </div>
            )}

            {corroborationActionSuccess && (
              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                {corroborationActionSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleCreateCorroboration()}
              disabled={submittingCorroboration}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingCorroboration
                ? "Saving..."
                : "Corroborate report"}
            </button>
          </div>
        ) : user ? (
          <p className="mt-6 text-sm text-slate-500">
            You can&apos;t corroborate your own report.
          </p>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <Link href={`/login?next=${encodeURIComponent(`/reports/${id}#corroborations`)}`} className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800">Sign in to participate</Link>
          </div>
        )}

        <div className="mt-6">
          {corroborationsLoading ? (
            <p className="text-sm text-slate-500">
              Loading corroborations...
            </p>
          ) : corroborations.length > 0 ? (
            <div className="space-y-3">
              {corroborations.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          Corroborated by <Link href={`/users/${item.user.id}`} className="hover:text-teal-800 hover:underline">@{item.user.username}</Link>
                        </p>

                        {item.user.is_verified && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>

                      {item.comment && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {item.comment}
                        </p>
                      )}
                    </div>

                    {user?.id === item.user_id && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteCorroboration(item.id)
                        }
                        disabled={submittingCorroboration}
                        className="w-fit text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>


      <section id="comments" className="report-detail-comments scroll-mt-24 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Comments</h2>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">{comments.length}</span>
        </div>

        {user ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Add a comment
          </h3>

          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            rows={4}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            disabled={submittingComment}
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            {commentActionError ? (
              <p className="text-sm text-red-600">
                {commentActionError}
              </p>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => void handleCreateComment()}
              disabled={submittingComment || !commentText.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingComment ? "Posting..." : "Post comment"}
            </button>
          </div>
        </div>
        ) : (
          <div className="mt-5">
            <Link href={`/login?next=${encodeURIComponent(`/reports/${id}#comments`)}`} className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800">Sign in to comment</Link>
          </div>
        )}

        <div className="mt-6">
          {commentsLoading ? (
            <p className="text-sm text-slate-500">
              Loading comments...
            </p>
          ) : comments.length === 0 ? (
            <div className="py-5 text-center">
              <p className="text-sm text-slate-500">
                No comments yet.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments
                .filter((comment) => !comment.parent_comment_id)
                .map((comment) => {
                  const replies = comments.filter(
                    (reply) => reply.parent_comment_id === comment.id
                  );

                  return (
                    <div key={comment.id} className="space-y-3">
                      <div className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              Comment by {comment.username?.trim() ? <Link href={`/users/${comment.user_id}`} className="hover:text-teal-800 hover:underline">@{comment.username.trim()}</Link> : "User"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>

                          {user && <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(comment.id);
                                setReplyText("");
                                setCommentActionError("");
                              }}
                              className="font-medium text-slate-600 hover:text-slate-950"
                            >
                              Reply
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingText(comment.content);
                                setCommentActionError("");
                              }}
                              className="font-medium text-slate-600 hover:text-slate-950"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment.id)}
                              disabled={submittingComment}
                              className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>}
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mt-4">
                            <textarea
                              value={editingText}
                              onChange={(event) =>
                                setEditingText(event.target.value)
                              }
                              rows={3}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              disabled={submittingComment}
                            />

                            <div className="mt-3 flex gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateComment(comment.id)
                                }
                                disabled={
                                  submittingComment || !editingText.trim()
                                }
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingText("");
                                }}
                                disabled={submittingComment}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {comment.content}
                          </p>
                        )}

                        {replyingTo === comment.id && (
                          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <textarea
                              value={replyText}
                              onChange={(event) =>
                                setReplyText(event.target.value)
                              }
                              placeholder="Write a reply..."
                              rows={3}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              disabled={submittingComment}
                            />

                            <div className="mt-3 flex gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCreateReply(comment.id)
                                }
                                disabled={
                                  submittingComment || !replyText.trim()
                                }
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reply
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                                disabled={submittingComment}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {replies.length > 0 && (
                        <div className="ml-6 space-y-3 border-l-2 border-slate-200 pl-5">
                          {replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-950">
                                    Reply by {reply.username?.trim() ? <Link href={`/users/${reply.user_id}`} className="hover:text-teal-800 hover:underline">@{reply.username.trim()}</Link> : "User"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {new Date(
                                      reply.created_at
                                    ).toLocaleString()}
                                  </p>
                                </div>

                                {user && <div className="flex items-center gap-3 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(reply.id);
                                      setEditingText(reply.content);
                                      setCommentActionError("");
                                    }}
                                    className="font-medium text-slate-600 hover:text-slate-950"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleDeleteComment(reply.id)
                                    }
                                    disabled={submittingComment}
                                    className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>}
                              </div>

                              {editingCommentId === reply.id ? (
                                <div className="mt-4">
                                  <textarea
                                    value={editingText}
                                    onChange={(event) =>
                                      setEditingText(event.target.value)
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                    disabled={submittingComment}
                                  />

                                  <div className="mt-3 flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleUpdateComment(reply.id)
                                      }
                                      disabled={
                                        submittingComment ||
                                        !editingText.trim()
                                      }
                                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Save
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingText("");
                                      }}
                                      disabled={submittingComment}
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {reply.content}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>
      </div>
      </div>
      {selectedEvidenceImage && <div role="presentation" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 sm:p-8" onClick={() => setSelectedEvidenceImage(null)}><section role="dialog" aria-modal="true" aria-label="Full-size evidence image" className="relative flex h-full w-full items-center justify-center"><button type="button" autoFocus aria-label="Close full-size image" onClick={() => setSelectedEvidenceImage(null)} className="absolute right-0 top-0 z-10 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Close</button><img src={selectedEvidenceImage} alt="Full-size report evidence" onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full object-contain" /></section></div>}
      </div>
    </>
  );
}
