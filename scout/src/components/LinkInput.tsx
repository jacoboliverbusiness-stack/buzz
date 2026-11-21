"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LinkInput({ autoFocus = false, compact = false }: { autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"link" | "manual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return setError("Paste your Hudl profile link to start.");
    setBusy("link");
    setError(null);
    try {
      const res = await fetch("/api/scans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      router.push(`/scan/${j.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function manual() {
    setBusy("manual");
    setError(null);
    const res = await fetch("/api/scans/manual", { method: "POST" });
    const j = await res.json();
    if (res.ok) router.push(`/scan/${j.id}`);
    else {
      setError(j.error ?? "Something went wrong.");
      setBusy(null);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} className={`group flex w-full flex-col gap-2 rounded-2xl border border-ink/15 bg-paper p-2 shadow-[0_1px_0_rgba(0,0,0,.04),0_12px_40px_-12px_rgba(0,0,0,.12)] transition focus-within:border-ink sm:flex-row sm:items-center ${compact ? "" : "sm:p-2.5"}`}>
        <label htmlFor="hudl-url" className="sr-only">Hudl profile URL</label>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-faint"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <input
            id="hudl-url"
            autoFocus={autoFocus}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your Hudl profile URL"
            className={`w-full min-w-0 bg-transparent py-3 outline-none placeholder:text-faint ${compact ? "text-[15px]" : "text-[16px] sm:text-[17px]"}`}
          />
        </div>
        <button
          type="submit"
          disabled={!!busy}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-medium text-paper transition hover:bg-ink/85 disabled:opacity-60"
        >
          {busy === "link" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-signal pulse-dot" /> Reading your profile…
            </>
          ) : (
            <>Find my opportunities <span aria-hidden>→</span></>
          )}
        </button>
      </form>
      <div className="mt-3 flex flex-col items-start justify-between gap-2 px-1 text-[13px] sm:flex-row sm:items-center">
        <button type="button" onClick={manual} disabled={!!busy} className="text-mute underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink">
          {busy === "manual" ? "Starting…" : "I don't have a Hudl profile"}
        </button>
        {error ? <p role="alert" className="text-signal">{error}</p> : <p className="text-faint">No account needed to see your matches.</p>}
      </div>
    </div>
  );
}
