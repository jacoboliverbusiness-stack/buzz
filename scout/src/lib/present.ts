import type { Plan } from "@/lib/billing/plans";
import type { Coach, EmailDraft, PipelineEvent, Scan } from "@/lib/types";

/**
 * What a viewer is allowed to see. Enforced server-side: locked content never leaves
 * the server, so it can't be recovered from the browser.
 */

export type PresentedEmail = EmailDraft & { locked?: boolean };
export type PresentedCoach = Coach & { emailMasked?: boolean };
export interface PresentedScan extends Omit<Scan, "accessToken" | "emails" | "matches"> {
  emails: PresentedEmail[];
  matches: Array<Omit<Scan["matches"][number], "coaches"> & { coaches: PresentedCoach[] }>;
  plan: { id: string; name: string; revealContacts: boolean; visibleEmailDrafts: number };
  signedIn: boolean;
}

export function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  return `${local[0]}${"•".repeat(Math.max(3, Math.min(8, local.length - 1)))}@${domain}`;
}

export function presentScan(scan: Scan, plan: Plan, signedIn: boolean): PresentedScan {
  const reveal = plan.limits.revealContacts;
  const { accessToken: _t, ...rest } = scan;
  const matches = scan.matches.map((m) => ({
    ...m,
    coaches: m.coaches.map((c): PresentedCoach =>
      reveal || c.demo || !c.email ? c : { ...c, email: maskEmail(c.email), phone: undefined, emailMasked: true },
    ),
  }));
  const emails = scan.emails.map((e) => presentEmail(e, scan, plan));
  const events = scan.events.map((ev) => presentEvent(ev, scan, plan));
  return {
    ...rest,
    events: events as Scan["events"],
    matches,
    emails,
    plan: { id: plan.id, name: plan.name, revealContacts: reveal, visibleEmailDrafts: plan.limits.visibleEmailDrafts },
    signedIn,
  };
}

/** Emails are unlocked by the rank of their program in the final match list. */
export function presentEmail(e: EmailDraft, scan: Scan, plan: Plan): PresentedEmail {
  const rank = scan.matches.findIndex((m) => m.program.id === e.programId);
  if (rank >= 0 && rank < plan.limits.visibleEmailDrafts) return e;
  const preview = e.body.split("\n").slice(0, 3).join("\n");
  return { ...e, body: preview, facts: [], locked: true };
}

export function presentEvent(ev: PipelineEvent, scan: Scan, plan: Plan): PipelineEvent {
  const reveal = plan.limits.revealContacts;
  const mask = (c: Coach) => (!reveal && c.email && !c.demo ? { ...c, email: maskEmail(c.email), phone: undefined } : c);
  if (ev.type === "coaches") return { ...ev, coaches: ev.coaches.map(mask) };
  if (ev.type === "match") return { ...ev, match: { ...ev.match, coaches: ev.match.coaches.map(mask) } };
  if (ev.type === "email") return { ...ev, email: presentEmail(ev.email, scan, plan) };
  return ev;
}
