"use client";

import Link from "next/link";
import { useState } from "react";
import PublicSiteHeader from "../components/PublicSiteHeader";

type GuideLanguage = "en" | "bn";

const guidePdfs: Record<GuideLanguage, string> = {
  en: "/guides/internet-archive-save-guide.pdf",
  bn: "/guides/internet-archive-save-guide-bengali.pdf",
};

export default function HowToSaveWebpagePage() {
  const [language, setLanguage] = useState<GuideLanguage>("en");
  const guidePdf = guidePdfs[language];
  const isBengali = language === "bn";
  const pdfTitle = isBengali
    ? "ইন্টারনেট আর্কাইভে ওয়েবপেজ সংরক্ষণের নির্দেশিকা"
    : "How to Save Web Pages and Facebook Posts with the Internet Archive";

  return (
    <>
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-teal-800 underline underline-offset-2">
              ← Back to feed
            </Link>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Shabdhan guide
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              How to save a webpage
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Follow this guide to save a webpage or Facebook post to the Internet Archive.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href={guidePdf}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open PDF in new tab
            </a>
            <a
              href={guidePdf}
              download
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
            >
              Download PDF
            </a>
          </div>
        </div>

        <section aria-label="Guide language" className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Choose a language / ভাষা নির্বাচন করুন</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Guide language">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${language === "en" ? "bg-teal-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage("bn")}
              aria-pressed={language === "bn"}
              lang="bn"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${language === "bn" ? "bg-teal-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              বাংলা
            </button>
          </div>
        </section>

        <section aria-label="Internet Archive saving guide" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            key={language}
            title={pdfTitle}
            src={`${guidePdf}#view=FitH`}
            className="h-[75dvh] min-h-[36rem] w-full"
          />
        </section>
        <p className="mt-3 text-sm text-slate-600">
          If the PDF does not display in your browser, use the Open PDF or Download PDF button above.
        </p>
      </main>
    </>
  );
}
