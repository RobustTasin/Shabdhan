"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "../../components/AuthProvider";

import {
  getEvidenceForReport,
  uploadEvidence,
  type Evidence,
} from "../../lib/evidence-api";
import {
  getReport,
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
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();

  const [report, setReport] = useState<ApiReport | null>(null);

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [corroborations, setCorroborations] = useState<ApiCorroboration[]>([]);
  const [corroborationsLoading, setCorroborationsLoading] = useState(true);
  const [corroborationComment, setCorroborationComment] = useState("");
  const [submittingCorroboration, setSubmittingCorroboration] = useState(false);
  const [corroborationActionError, setCorroborationActionError] = useState("");
  const [corroborationActionSuccess, setCorroborationActionSuccess] = useState("");

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
      .then(([reportResponse, evidenceResponse, commentsResponse, corroborationsResponse]) => {
        setReport(reportResponse.report);
        setEvidence(evidenceResponse.evidence);
        setComments(commentsResponse.comments);
        setCorroborations(corroborationsResponse.corroborations);
      })
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

  async function handleUpload() {
    if (!id || !selectedFile) {
      setUploadError("Please select an evidence file.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const response = await uploadEvidence(
        id,
        selectedFile,
        description
      );

      setEvidence((current) => [
        response.evidence,
        ...current,
      ]);

      setSelectedFile(null);
      setDescription("");
      setUploadSuccess("Evidence uploaded successfully.");

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
      <div className="p-8 text-sm text-slate-500">
        Loading report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Link
          href="/reports"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to reports
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
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
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

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {reportStatusLabel(
              report.status,
              report.verification_status
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Report details
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {report.description}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Category
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {report.category?.name ?? "Uncategorized"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Verification
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {report.verification_status}
                </p>
              </div>

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

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Last updated
                </p>

                <p className="mt-1 text-sm text-slate-900">
                  {new Date(
                    report.updated_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Reported account
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
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Evidence
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload files that support this report.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Add evidence
          </h3>

          <div className="mt-4 space-y-4">
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
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"
                onChange={(event) => {
                  setSelectedFile(
                    event.target.files?.[0] ?? null
                  );
                  setUploadError("");
                  setUploadSuccess("");
                }}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
              />

              {selectedFile && (
                <p className="mt-2 text-xs text-slate-500">
                  {selectedFile.name} ·{" "}
                  {formatFileSizeFromType(selectedFile)}
                </p>
              )}
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
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {uploadSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload evidence"}
            </button>
          </div>
        </div>

        <div className="mt-6">
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

              <p className="mt-1 text-xs text-slate-500">
                Upload supporting evidence using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
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

                      {item.uploader && (
                        <p className="mt-2 text-xs text-slate-400">
                          Uploaded by {item.uploader.username}
                        </p>
                      )}
                    </div>

                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${verificationBadgeClass(
                        item.verification_status
                      )}`}
                    >
                      {item.verification_status}
                    </span>
                  </div>

                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-slate-700 underline"
                    >
                      Open evidence
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Corroborations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {corroborations.length}{" "}
              {corroborations.length === 1
                ? "user has"
                : "users have"}{" "}
              corroborated this report.
            </p>
          </div>
        </div>

        {user ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
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
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
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
        ) : null}

        <div className="mt-6">
          {corroborationsLoading ? (
            <p className="text-sm text-slate-500">
              Loading corroborations...
            </p>
          ) : corroborations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No one has corroborated this report yet.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Be the first to add independent support.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {corroborations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {item.user.username}
                        </p>

                        {item.user.is_verified && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
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
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Comments
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Discuss this report, provide context, or respond to other users.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
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

        <div className="mt-6">
          {commentsLoading ? (
            <p className="text-sm text-slate-500">
              Loading comments...
            </p>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
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
                      <div className="rounded-xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {comment.username}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
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
                          </div>
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
                                    {reply.username}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {new Date(
                                      reply.created_at
                                    ).toLocaleString()}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
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
                                </div>
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
  );
}