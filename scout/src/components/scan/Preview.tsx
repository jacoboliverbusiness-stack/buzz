"use client";

import Link from "next/link";
import { useState } from "react";
import type { PresentedScan } from "@/lib/present";
import { DIVISION_LABEL } from "@/lib/types";
import { SchoolLogo } from "./SchoolLogo";

/**
 * Lightweight campaign preview shown at the end of onboarding. The full dashboard
 * (filters, editing, sending) comes later.
 */
export function Preview({ scan }: { scan: PresentedScan }) {
  const [open, setOpen] = useState<string | null>(scan.matches[0]?.program.id ?? null);
  const coaches = scan.matches.reduce((n, m) => n + m.coaches.length, 0);
  const verified = scan.matches.reduce((n, m) => n + m.coaches.filter((c) => c.verification === "verified").length, 0);
  const emailsBy = new Map(scan.emails.map((e) => [e.programId, e]));

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      {scan.mode === "demo" && (
        <p className="mb-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-[13px] text-warn">
          Demo mode — rosters and coaches below are labelled sample data, not real contacts.
        </p>
      )}
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">Your campaign is ready</p>
      <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[38px]">
        {scan.matches.length} programs, {coaches} coaches, {scan.emails.length} emails.
      </h1>
      <p className="mt-3 text-[15px] text-mute">
        {scan.profile.firstName} {scan.profile.lastName} · {scan.profile.positions.join("/")} · Class of {scan.profile.gradYear}{verified > 0 ? ` · ${verified} addresses verified from official staff pages` : ""}
      </p>

      {!scan.signedIn && (
        <div className="mt-8 flex flex-col gap-4 rounded-xl bg-ink p-6 text-paper sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[16px] font-medium">Save this campaign</p>
            <p className="mt-1 text-[14px] text-paper/70">Create a free account to keep your matches. Subscribe to see every coach&apos;s email and all drafts.</p>
          </div>
          <Link href={`/signin?next=/scan/${scan.id}&claim=${scan.id}`} className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-paper px-5 text-[14px] font-medium text-ink">
            Create account
          </Link>
        </div>
      )}

      <ul className="mt-8 border-t hairline">
        {scan.matches.map((m) => {
          const email = emailsBy.get(m.program.id);
          const isOpen = open === m.program.id;
          return (
            <li key={m.program.id} className="border-b hairline">
              <button type="button" onClick={() => setOpen(isOpen ? null : m.program.id)} className="flex w-full items-center gap-4 py-4 text-left">
                <SchoolLogo program={m.program} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{m.program.school}</p>
                  <p className="truncate text-[13px] text-mute">
                    {DIVISION_LABEL[m.program.division]}{m.program.conference ? ` · ${m.program.conference}` : ""} · {m.program.city}, {m.program.state}
                  </p>
                </div>
                {m.outlook && (m.outlook.signal === "strong" || m.outlook.signal === "moderate") && (
                  <span className="hidden shrink-0 rounded-full border hairline px-2.5 py-0.5 text-[11px] text-mute sm:inline">Projected opening</span>
                )}
                <span className="text-mute">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="rise grid gap-6 pb-6 pl-[52px] md:grid-cols-2">
                  <div className="space-y-4 text-[14px]">
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-mute">Why this program</p>
                      <ul className="space-y-1.5">{m.reasons.map((r, i) => <li key={i}>— {r.text}</li>)}</ul>
                      {m.outlook && <p className="mt-2 text-[12px] text-faint">Roster projections come from listed class years and aren&apos;t confirmed needs or offers.</p>}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-mute">Coaches</p>
                      <ul className="divide-y divide-line rounded-lg border hairline">
                        {m.coaches.map((c) => (
                          <li key={c.id} className="px-3 py-2">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-[12px] text-mute">{c.title}</p>
                            {c.email && (
                              <p className="mt-0.5 font-mono text-[12px]">
                                {c.email}{" "}
                                <span className={c.verification === "verified" ? "text-ok" : "text-faint"}>· {c.verification}</span>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {email && (
                    <div className="rounded-lg border hairline bg-wash p-4">
                      <p className="text-[12px] text-mute">Subject</p>
                      <p className="text-[14px] font-medium">{email.subject}</p>
                      <pre className={`mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed ${email.locked ? "max-h-24 overflow-hidden [mask-image:linear-gradient(black,transparent)]" : ""}`}>{email.body}</pre>
                      {email.locked && (
                        <Link href="/pricing" className="mt-2 inline-block text-[13px] underline underline-offset-4">Unlock all drafts</Link>
                      )}
                      {!email.locked && email.generator === "grounded-template" && <p className="mt-3 text-[11px] text-faint">Drafted from your verified facts.</p>}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
