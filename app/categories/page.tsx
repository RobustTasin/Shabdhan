"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ProfilePageLayout from "../components/ProfilePageLayout";
import { getCategories, searchReports, type Category } from "../lib/reports-api";

type ListedCategory = Pick<Category, "id" | "name" | "description"> & { report_count: number };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ListedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      getCategories(),
      searchReports({ categoryId: "uncategorized", limit: 1 }),
    ]).then(([response, uncategorized]) => {
      if (!active) return;
      const listed: ListedCategory[] = response.categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        report_count: category.report_count ?? 0,
      }));
      if (uncategorized.pagination.total > 0) {
        listed.push({
          id: "uncategorized",
          name: "Uncategorized",
          description: "Published reports that have not been assigned a category.",
          report_count: uncategorized.pagination.total,
        });
      }
      listed.sort((a, b) => b.report_count - a.report_count || a.name.localeCompare(b.name));
      setCategories(listed);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load categories.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <ProfilePageLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-[#dbe7e5] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,37,0.06)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#24716c]">Explore reports</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d3837]">Browse categories</h1>
          <p className="mt-2 text-sm leading-6 text-[#617573]">Choose a category to see its published reports.</p>
        </section>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        <section aria-label="Report categories" className="overflow-hidden rounded-3xl border border-[#dbe7e5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e3eeec] px-5 py-4 sm:px-7">
            <h2 className="font-semibold text-[#1d3837]">All categories</h2>
            {!loading && <span className="text-sm text-[#718481]">{categories.length} {categories.length === 1 ? "category" : "categories"}</span>}
          </div>
          {loading ? (
            <p className="p-10 text-center text-sm text-[#718481]">Loading categories…</p>
          ) : error ? null : categories.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#718481]">No categories are available yet.</p>
          ) : (
            <div className="divide-y divide-[#e3eeec]">
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${encodeURIComponent(category.id)}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#f4f9f8] sm:px-7">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#1d3837]">{category.name}</h3>
                    {category.description && <p className="mt-1 line-clamp-2 text-sm text-[#718481]">{category.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#edf8f6] px-3.5 py-1.5 text-sm font-semibold tabular-nums text-[#24716c]">
                    {category.report_count.toLocaleString()}
                    <span className="sr-only"> {category.report_count === 1 ? "report" : "reports"}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProfilePageLayout>
  );
}
