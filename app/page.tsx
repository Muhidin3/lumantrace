"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

type ScanStats = {
  harmless?: number;
  malicious?: number;
  suspicious?: number;
  undetected?: number;
};

type ScanResponse = {
  status: "pending" | "completed";
  analysisId: string;
  stats?: ScanStats;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);

  const riskLabel = useMemo(() => {
    if (!result?.stats) {
      return "No scan yet";
    }

    if ((result.stats.malicious ?? 0) > 0) {
      return "Malicious";
    }

    if ((result.stats.suspicious ?? 0) > 0) {
      return "Suspicious";
    }

    return "Likely safe";
  }, [result]);

  const summaryTone = useMemo(() => {
    if (!result?.stats) {
      return "border-(--line) bg-(--chip) text-(--ink)";
    }

    if ((result.stats.malicious ?? 0) > 0) {
      return "border-red-300 bg-red-100/70 text-red-900";
    }

    if ((result.stats.suspicious ?? 0) > 0) {
      return "border-amber-300 bg-amber-100/75 text-amber-900";
    }

    return "border-emerald-300 bg-emerald-100/75 text-emerald-900";
  }, [result]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as ScanResponse | { error?: string };

      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Scan failed");
      }

      setResult(data as ScanResponse);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong while scanning this URL."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-3xl border border-(--line) bg-(--panel) p-7 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.45)] backdrop-blur sm:gap-8 sm:p-10">
        <header className="space-y-4 text-center">
          <p className="inline-flex w-fit rounded-full border border-(--line) bg-(--chip) px-3 py-1 text-xs font-semibold tracking-[0.22em] text-(--muted) uppercase">
            URL Threat Scanner
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-(--ink) sm:text-5xl">
            Lumantrace
          </h1>
          <p className="mx-auto max-w-2xl px-1 text-sm leading-7 text-(--muted) sm:px-0 sm:text-base">
            Paste any URL to check if it could be spam, phishing, or malware.
          </p>
          <div className="mx-auto mt-3 flex w-fit items-center gap-3 rounded-full border border-(--line) bg-(--chip) px-3 py-2">
            <Image
              src="/logo.jpg"
              alt="Lumen Labs logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
            <p className="text-xs font-medium tracking-[0.14em] text-(--muted) uppercase">
              Made by Lumen Labs
            </p>
          </div>
        </header>

        <form className="space-y-5" onSubmit={onSubmit}>
          <label htmlFor="url" className="block text-sm font-medium text-(--ink)">
            Website URL
          </label>
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              className="h-13 w-full rounded-xl border border-(--line) bg-(--cream) px-4 text-(--ink) outline-none ring-0 transition focus:border-(--accent)"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-13 rounded-xl bg-(--accent) px-5 text-sm font-semibold text-(--cream) transition hover:brightness-110 sm:px-6"
            >
              {loading ? "Checking..." : "Check URL"}
            </button>
          </div>
        </form>

        {loading && (
          <section className="rounded-2xl border border-(--line) bg-(--chip) p-7 text-center sm:p-8">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-(--muted) border-t-transparent" />
            <p className="text-sm font-medium text-(--ink)">Scanning URL...</p>
            <p className="mt-1 text-xs text-(--muted)">Please wait while preparing the result.</p>
          </section>
        )}

        {!loading && (
          <section className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-100/70 p-5 text-sm text-red-900">
                {error}
              </div>
            )}

            {!error && !result && (
              <div className="rounded-2xl border border-dashed border-(--line) bg-(--chip) p-5 text-sm text-(--ink)">
                No scan yet. Submit a URL to see results here.
              </div>
            )}

            {!error && result?.status === "pending" && (
              <div className="rounded-2xl border border-amber-300 bg-amber-100/75 p-5 text-sm text-amber-900">
                Scan created and still processing. Analysis ID: {result.analysisId}
              </div>
            )}

            {!error && result?.status === "completed" && result.stats && (
              <>
                <div className={`rounded-2xl border p-5 ${summaryTone}`}>
                  <p className="text-xs tracking-[0.16em] uppercase">Conclusion</p>
                  <p className="mt-2 text-2xl font-semibold">{riskLabel}</p>
                </div>

                <div className="rounded-2xl border border-(--line) bg-(--chip) p-5">
                  <p className="text-xs tracking-[0.16em] text-(--muted) uppercase">Details</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg border border-(--line) bg-(--cream) px-3 py-2">
                      Harmless: {result.stats.harmless ?? 0}
                    </div>
                    <div className="rounded-lg border border-(--line) bg-(--cream) px-3 py-2">
                      Malicious: {result.stats.malicious ?? 0}
                    </div>
                    <div className="rounded-lg border border-(--line) bg-(--cream) px-3 py-2">
                      Suspicious: {result.stats.suspicious ?? 0}
                    </div>
                    <div className="rounded-lg border border-(--line) bg-(--cream) px-3 py-2">
                      Undetected: {result.stats.undetected ?? 0}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-(--muted)">Analysis ID: {result.analysisId}</p>
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}