"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
  type ApiUser,
} from "@/app/lib/users-api";
import {
  getAuditLogs,
  type ApiAuditLog,
} from "@/app/lib/audit-logs-api";
import type { UserRole } from "@/app/lib/auth";

const roles: UserRole[] = [
  "USER",
  "MODERATOR",
  "ADMIN",
  "ENTITY_OWNER",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function roleLabel(role: UserRole) {
  return role.replace("_", " ");
}

export default function ModerationPage() {
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const canModerate =
    user?.role === "MODERATOR" || user?.role === "ADMIN";

  const isAdmin = user?.role === "ADMIN";

  async function loadModerationData() {
    if (!canModerate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [usersResponse, logsResponse] = await Promise.all([
        getUsers(),
        getAuditLogs({ page: 1, limit: 20 }),
      ]);

      setUsers(usersResponse.users);
      setAuditLogs(logsResponse.audit_logs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load moderation data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      loadModerationData();
    }
  }, [authLoading, canModerate]);

  async function handleStatusChange(
    targetUser: ApiUser
  ) {
    try {
      setUpdatingUser(targetUser.id);
      setError("");

      const response = await updateUserStatus(
        targetUser.id,
        !targetUser.is_active
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === targetUser.id
            ? response.user
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user status."
      );
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleRoleChange(
    targetUser: ApiUser,
    role: UserRole
  ) {
    if (!isAdmin || role === targetUser.role) {
      return;
    }

    try {
      setUpdatingUser(targetUser.id);
      setError("");

      const response = await updateUserRole(
        targetUser.id,
        role
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === targetUser.id
            ? response.user
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user role."
      );
    } finally {
      setUpdatingUser(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Loading moderation tools...
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading users and audit logs...
        </div>
      </main>
    );
  }

  if (!user || !canModerate) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administrative moderation tools.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">
            Access denied
          </h2>
          <p className="mt-2 text-sm text-red-700">
            You need MODERATOR or ADMIN permissions to access
            this page.
          </p>
        </div>
      </main>
    );
  }

  const activeUsers = users.filter(
    (item) => item.is_active
  ).length;

  const verifiedUsers = users.filter(
    (item) => item.is_verified
  ).length;

  const moderatorCount = users.filter(
    (item) =>
      item.role === "MODERATOR" ||
      item.role === "ADMIN"
  ).length;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Moderation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage users, permissions, account status, and review
          moderation activity.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {users.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {activeUsers}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Verified users
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {verifiedUsers}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Moderators / admins
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {moderatorCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            User Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage account status and roles.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-600">
                  User
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  Role
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  Verified
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  Created
                </th>
                <th className="px-5 py-3 font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((targetUser) => {
                const isUpdating =
                  updatingUser === targetUser.id;

                return (
                  <tr key={targetUser.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">
                        {targetUser.username}
                      </div>
                      <div className="text-xs text-slate-500">
                        {targetUser.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {isAdmin ? (
                        <select
                          value={targetUser.role}
                          disabled={isUpdating}
                          onChange={(event) =>
                            handleRoleChange(
                              targetUser,
                              event.target.value as UserRole
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-500"
                        >
                          {roles.map((role) => (
                            <option
                              key={role}
                              value={role}
                            >
                              {roleLabel(role)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {roleLabel(targetUser.role)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          targetUser.is_active
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                        }
                      >
                        {targetUser.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          targetUser.is_verified
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }
                      >
                        {targetUser.is_verified
                          ? "Yes"
                          : "No"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {formatDate(
                        targetUser.created_at
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          handleStatusChange(targetUser)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating
                          ? "Updating..."
                          : targetUser.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Audit Logs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Recent moderation and administrative activity.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">
              No audit logs found.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium text-slate-900">
                      {log.action}
                    </span>

                    {log.username && (
                      <span className="ml-2 text-sm text-slate-500">
                        by {log.username}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {log.entity_type || "System"}
                  {log.entity_id
                    ? ` · ${log.entity_id}`
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
