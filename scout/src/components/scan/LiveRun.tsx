"use client";

import type { Match, PipelineEvent, PipelineStep } from "@/lib/types";
import { DIVISION_LABEL } from "@/lib/types";
import { SchoolLogo } from "./SchoolLogo";

export const STEP_LABEL: Record<PipelineStep, string> = {
  profile: "Analyzing your athlete profile",
  opportunities: "Understanding your recruiting opportunities",
  programs: "Identifying matching college programs",
  rosters: "Researching roster needs",
  coaches: "Finding relevant coaching staff",
  verify: "Verifying contact information",
  emails: "Preparing personalized recruiting emails",
};
const ORDER = Object.keys(STEP_LABEL) as PipelineStep[];

export interface LiveState {
  steps: Partial<Record<PipelineStep, { state: "start" | "done"; detail?: string }>>;
  matches: Record<string, Match>;
  emails: number;
  coaches: number;
  outlooks: number;
  notes: string[];
  error?: string;
  done: boolean;
}

export const emptyLive = (): LiveState => ({ steps: {}, matches: {}, emails: 0, coaches: 0, outlooks: 0, notes: [], done: false });

export function reduceLive(s: LiveState, e: PipelineEvent): LiveState {
  switch (e.type) {
    case "step":
      return { ...s, steps: { ...s.steps, [e.step]: { state: e.state, detail: e.detail ?? s.steps[e.step]?.detail } } };
    case "match":
      return { ...s, matches: { ...s.matches, [e.match.program.id]: e.match } };
    case "coaches":
      return { ...s, coaches: s.coaches + e.coaches.length };
    case "outlook":
      return { ...s, outlooks: s.outlooks + 1 };
    case "email":
      return { ...s, emails: s.emails + 1 };
    case "note":
      return { ...s, notes: [...s.notes, e.text].slice(-6) };
    case "error":
      return { ...s, error: e.message, done: true };
    case "done":
      return { ...s, done: true };
  }
}

function StepIcon({ state }: { state?: "start" | "done" }) {
  if (state === "done")
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.2 2.2L9.5 3.5" /></svg>
      </span>
    );
  if (state === "start") return <span className="grid h-5 w-5 place-items-center rounded-full border border-ink"><span className="h-1.5 w-1.5 rounded-full bg-signal pulse-dot" /></span>;
  return <span className="h-5 w-5 rounded-full border hairline" />;
}

export function LiveRun({ live, athleteName }: { live: LiveState; athleteName: string }) {
  const matches = Object.values(live.matches).sort((a, b) => b.score - a.score);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[22rem_1fr]">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">Step 2 of 2 · Building</p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em]">Working on {athleteName}&apos;s campaign</h1>
        <ol className="mt-8 space-y-0">
          {ORDER.map((k, i) => {
            const st = live.steps[k];
            return (
              <li key={k} className="relative flex gap-3 pb-5">
                {i < ORDER.length - 1 && <span className={`absolute left-[9.5px] top-6 h-[calc(100%-1.25rem)] w-px ${st?.state === "done" ? "bg-ink" : "bg-line"}`} />}
                <StepIcon state={st?.state} />
                <div className="min-w-0 -mt-px">
                  <p className={`text-[14px] ${st ? "text-ink" : "text-faint"}`}>{STEP_LABEL[k]}</p>
                  {st?.detail && <p className="mt-0.5 text-[12px] text-mute">{st.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {live.notes.length > 0 && (
          <div className="mt-2 rounded-lg bg-wash p-3 font-mono text-[11px] leading-relaxed text-mute">
            {live.notes.map((n, i) => <p key={i}>{n}</p>)}
          </div>
        )}
        {live.error && <p className="mt-4 text-[14px] text-signal">{live.error}</p>}
      </aside>

      <section>
        <div className="grid grid-cols-3 border-y hairline">
          {[
            ["Programs", matches.length],
            ["Coaches", live.coaches],
            ["Emails", live.emails],
          ].map(([l, n]) => (
            <div key={l as string} className="border-r hairline px-4 py-4 last:border-r-0">
              <p className="text-[12px] text-mute">{l}</p>
              <p className="mt-1 text-[28px] font-semibold tabular tracking-[-0.03em]">{n}</p>
            </div>
          ))}
        </div>
        {matches.length === 0 ? (
          <div className="mt-6 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="scanline h-16 rounded-lg bg-wash" />)}
          </div>
        ) : (
          <ul className="mt-2">
            {matches.map((m) => (
              <li key={m.program.id} className="rise flex items-center gap-4 border-b hairline py-4">
                <SchoolLogo program={m.program} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{m.program.school}</p>
                  <p className="truncate text-[13px] text-mute">{m.reasons[0]?.text ?? `${DIVISION_LABEL[m.program.division]} · ${m.program.city}, ${m.program.state}`}</p>
                </div>
                <div className="hidden shrink-0 text-right text-[12px] text-mute sm:block">
                  <p>{DIVISION_LABEL[m.program.division]}</p>
                  <p>{m.coaches.length} {m.coaches.length === 1 ? "coach" : "coaches"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
