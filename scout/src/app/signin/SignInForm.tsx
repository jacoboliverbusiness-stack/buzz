"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const claim = params.get("claim");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch("/api/auth/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, next, guardianConsent: consent }) });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error);
      setState("idle");
      return;
    }
    if (j.signedIn) {
      if (claim) await fetch(`/api/scans/${claim}/claim`, { method: "POST" });
      router.push(next);
      router.refresh();
    } else setState("sent");
  }

  if (state === "sent")
    return <p className="mt-8 text-[15px] text-mute">Check <span className="text-ink">{email}</span> for a sign-in link.</p>;

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="h-12 w-full rounded-lg border hairline px-3 text-[15px] outline-none focus:border-ink" />
      <label className="flex gap-3 text-[13px] leading-relaxed text-mute">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-black" />
        <span>I&apos;m 18 or older, or I&apos;m the parent or guardian of the athlete and agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy policy</a>.</span>
      </label>
      <button disabled={!consent || state === "busy"} className="h-12 w-full rounded-lg bg-ink text-[15px] font-medium text-paper disabled:opacity-40">
        {state === "busy" ? "Sending…" : "Continue with email"}
      </button>
      {error && <p className="text-[13px] text-signal">{error}</p>}
    </form>
  );
}
