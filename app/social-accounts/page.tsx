"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createSocialAccount,
  deleteSocialAccount,
  getSocialAccounts,
  updateSocialAccount,
  type SocialAccount,
} from "../lib/social-accounts-api";

type FormState = {
  platform: string;
  username: string;
  display_name: string;
  profile_url: string;
  account_id: string;
};

const emptyForm: FormState = {
  platform: "",
  username: "",
  display_name: "",
  profile_url: "",
  account_id: "",
};

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");

      const response = await getSocialAccounts();
      setAccounts(response.social_accounts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load social accounts"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(account: SocialAccount) {
    setEditingId(account.id);
    setForm({
      platform: account.platform,
      username: account.username,
      display_name: account.display_name ?? "",
      profile_url: account.profile_url ?? "",
      account_id: account.account_id ?? "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.platform.trim() || !form.username.trim()) {
      setError("Platform and username are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        platform: form.platform.trim(),
        username: form.username.trim(),
        display_name: form.display_name.trim() || undefined,
        profile_url: form.profile_url.trim() || undefined,
        account_id: form.account_id.trim() || undefined,
      };

      if (editingId) {
        const response = await updateSocialAccount(
          editingId,
          payload
        );

        setAccounts((current) =>
          current.map((account) =>
            account.id === editingId
              ? response.social_account
              : account
          )
        );

        setSuccess("Social account updated successfully.");
      } else {
        const response = await createSocialAccount(payload);

        setAccounts((current) => [
          response.social_account,
          ...current,
        ]);

        setSuccess("Social account created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save social account"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: SocialAccount) {
    const confirmed = window.confirm(
      `Delete the ${account.platform} account "${account.username}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteSocialAccount(account.id);

      setAccounts((current) =>
        current.filter((item) => item.id !== account.id)
      );

      setSuccess("Social account deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete social account"
      );
    }
  }

  return (
    <main className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Account management
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Social Accounts
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage the social media accounts that can be associated
            with Shabdhan reports.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Add account
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId
                  ? "Edit social account"
                  : "Add social account"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Platform and username are required.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Platform *
                </span>

                <input
                  type="text"
                  value={form.platform}
                  onChange={(event) =>
                    updateField("platform", event.target.value)
                  }
                  placeholder="Facebook"
                  maxLength={50}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Username *
                </span>

                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    updateField("username", event.target.value)
                  }
                  placeholder="@username"
                  maxLength={255}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Display name
                </span>

                <input
                  type="text"
                  value={form.display_name}
                  onChange={(event) =>
                    updateField("display_name", event.target.value)
                  }
                  placeholder="Account display name"
                  maxLength={255}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Account ID
                </span>

                <input
                  type="text"
                  value={form.account_id}
                  onChange={(event) =>
                    updateField("account_id", event.target.value)
                  }
                  placeholder="Platform account ID"
                  maxLength={255}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Profile URL
              </span>

              <input
                type="url"
                value={form.profile_url}
                onChange={(event) =>
                  updateField("profile_url", event.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create account"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading accounts..."
                  : `${accounts.length} ${
                      accounts.length === 1
                        ? "account"
                        : "accounts"
                    }`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500 sm:px-6">
            Loading social accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <p className="text-sm font-medium text-slate-700">
              No social accounts yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add a social account to associate it with reports.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {account.platform}
                      </span>

                      {account.account_id && (
                        <span className="text-xs text-slate-400">
                          ID: {account.account_id}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 break-words text-base font-semibold text-slate-950">
                      {account.display_name || account.username}
                    </h3>

                    <p className="mt-1 break-words text-sm text-slate-600">
                      {account.username}
                    </p>

                    {account.profile_url && (
                      <a
                        href={account.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block max-w-full break-all text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {account.profile_url}
                      </a>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      Created{" "}
                      {new Date(
                        account.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(account)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(account)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
