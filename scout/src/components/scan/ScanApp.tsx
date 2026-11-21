"use client";

import { useCallback, useState } from "react";
import type { PresentedScan } from "@/lib/present";
import type { AthleteProfile, PipelineEvent, Preferences } from "@/lib/types";
import { ConfirmStep } from "./ConfirmStep";
import { emptyLive, LiveRun, reduceLive, type LiveState } from "./LiveRun";
import { Preview } from "./Preview";

type Phase = "confirm" | "running" | "done";

export function ScanApp({ initial }: { initial: PresentedScan }) {
  const [scan, setScan] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial.status === "complete" ? "done" : "confirm");
  const [live, setLive] = useState<LiveState>(emptyLive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (profile: AthleteProfile, preferences: Preferences) => {
      setBusy(true);
      setError(null);
      const res = await fetch(`/api/scans/${scan.id}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, preferences }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setScan((s) => ({ ...s, profile }));
      setLive(emptyLive());
      setPhase("running");
      window.scrollTo({ top: 0 });

      // Read the NDJSON stream: every line is a real pipeline event.
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let state = emptyLive();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          state = reduceLive(state, JSON.parse(line) as PipelineEvent);
          setLive(state);
        }
      }
      const fresh = await fetch(`/api/scans/${scan.id}`, { cache: "no-store" }).then((r) => r.json());
      setScan(fresh);
      setBusy(false);
      if (fresh.status === "complete") setTimeout(() => setPhase("done"), 600);
      else {
        setError(fresh.error ?? state.error ?? "The campaign couldn't be built.");
        setPhase("confirm");
      }
    },
    [scan.id],
  );

  if (phase === "running") return <LiveRun live={live} athleteName={scan.profile.firstName || "your"} />;
  if (phase === "done") return <Preview scan={scan} />;
  return <ConfirmStep scan={scan} onRun={run} busy={busy} error={error} />;
}
