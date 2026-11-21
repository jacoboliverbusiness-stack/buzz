import "server-only";
import { seedPrograms } from "@/lib/colleges/programs";
import { integrations } from "@/lib/env";
import { mapLimit } from "@/lib/http/fetcher";
import { diversify, finalScore, prefilter, researchPool, type Candidate } from "@/lib/matching/score";
import { composeEmail } from "@/lib/outreach/compose";
import { rosterOutlook } from "@/lib/roster/outlook";
import { coachRelevance, type FootballGroup } from "@/lib/sports/football";
import { SPORTS } from "@/lib/sports";
import { getStore } from "@/lib/store";
import type { Coach, EmailDraft, Match, PipelineEvent, Scan } from "@/lib/types";
import { demoCoaches, demoRoster } from "./demo";
import { researchProgram } from "./research";

export const TARGET_MATCHES = Number(process.env.SCOUT_TARGET_MATCHES ?? 20);
const RESEARCH_BUFFER = 1.4; // research a few extra in case some sites can't be read
const RESEARCH_CONCURRENCY = 10;
const EMAIL_CONCURRENCY = 6;
const CONTACTS_PER_PROGRAM = 3;

type Emit = (e: PipelineEvent) => void;
const now = () => new Date().toISOString();

export function pickContacts(coaches: Coach[], group: string | undefined): Coach[] {
  const ranked = coaches
    .map((c) => ({ c, r: coachRelevance(c, group as FootballGroup | undefined) + (c.email ? 5 : 0) + (c.verification === "verified" ? 3 : 0) }))
    .filter((x) => x.r > 10)
    .sort((a, b) => b.r - a.r);
  const out: Coach[] = [];
  const seenEmail = new Set<string>();
  for (const { c } of ranked) {
    if (c.email && seenEmail.has(c.email)) continue;
    if (c.email) seenEmail.add(c.email);
    out.push(c);
    if (out.length >= CONTACTS_PER_PROGRAM) break;
  }
  return out;
}

/** The one coach who gets the first email: the most relevant coach with a usable address. */
export function primaryContact(contacts: Coach[]): Coach | undefined {
  return contacts.find((c) => c.email && c.verification !== "invalid");
}

export async function runPipeline(scan: Scan, emit: Emit): Promise<Scan> {
  const store = getStore();
  const flags = integrations();
  const demo = flags.demoMode;
  const athlete = scan.profile;
  const sport = SPORTS[athlete.sport];
  const group = athlete.positions.map((p) => sport.positionGroups(p)[0]).find(Boolean);
  const groupPlural = group ? sport.groupLabel(group).plural : "players";
  let usd = 0;

  const push = (e: PipelineEvent) => {
    scan.events.push(e);
    emit(e);
  };
  const step = (s: Extract<PipelineEvent, { type: "step" }>["step"], state: "start" | "done", detail?: string) =>
    push({ type: "step", step: s, state, detail, at: now() });

  scan.status = "running";
  scan.mode = demo ? "demo" : "live";
  scan.events = [];
  scan.matches = [];
  scan.emails = [];
  await store.saveScan(scan);

  try {
    step("profile", "start");
    if (!sport.enabled) throw new Error(`${sport.label} campaigns are coming soon. Scout currently supports football.`);
    if (!athlete.gradYear) throw new Error("Graduation year is required.");
    step("profile", "done", `${athlete.firstName} ${athlete.lastName} · ${athlete.positions.join("/")} · Class of ${athlete.gradYear}`);

    step("opportunities", "start");
    const catalogue = seedPrograms(athlete.sport);
    const cands = prefilter(catalogue, athlete, scan.preferences);
    if (!cands.length) throw new Error("No programs match those preferences. Try widening divisions or locations.");
    step("opportunities", "done", `${cands.length} of ${catalogue.length} ${sport.label.toLowerCase()} programs fit your preferences`);

    step("programs", "start");
    const pool = researchPool(cands, scan.preferences, Math.ceil(TARGET_MATCHES * RESEARCH_BUFFER));
    step("programs", "done", `Shortlisted ${pool.length} programs to research`);

    step("rosters", "start");
    step("coaches", "start");
    const season = new Date().getUTCMonth() >= 4 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1;
    let rostersRead = 0;
    let staffRead = 0;
    const researched: Array<Match & { _c: Candidate }> = [];

    await mapLimit(pool, RESEARCH_CONCURRENCY, async (c) => {
      const r = demo
        ? { snapshot: demoRoster(c.program, season), coaches: demoCoaches(c.program, group), usd: 0, notes: [] as string[] }
        : await researchProgram(c.program).catch((e) => ({ snapshot: null, coaches: [] as Coach[], usd: 0, notes: [String(e?.message ?? e)] }));
      usd += r.usd;
      for (const n of r.notes) push({ type: "note", level: "warn", text: n, at: now() });
      const outlook = r.snapshot && group && athlete.gradYear ? rosterOutlook(r.snapshot, group, athlete.gradYear, groupPlural) : undefined;
      if (r.snapshot) rostersRead++;
      if (outlook) push({ type: "outlook", programId: c.program.id, outlook, at: now() });
      const contacts = pickContacts(r.coaches, group);
      if (contacts.length) {
        staffRead++;
        push({ type: "coaches", programId: c.program.id, coaches: contacts, at: now() });
      }
      const { score, reasons } = finalScore(c, athlete, group, outlook, r.snapshot, groupPlural);
      const match: Match = { program: c.program, score, reasons, outlook, distanceMiles: c.distanceMiles, coaches: contacts };
      // Programs with no reachable staff can't be contacted — keep them out of the campaign.
      if (contacts.length) {
        researched.push({ ...match, _c: c });
        push({ type: "match", match, at: now() });
      }
    });
    step("rosters", "done", `Read ${rostersRead} rosters`);
    step("coaches", "done", `Found staff at ${staffRead} programs`);

    const finalMatches = diversify(researched, scan.preferences, TARGET_MATCHES, (m) => m.score).map(({ _c, ...m }) => m);
    scan.matches = finalMatches;

    step("verify", "start");
    const contacts = finalMatches.flatMap((m) => m.coaches);
    const withEmail = contacts.filter((c) => c.email);
    const verified = withEmail.filter((c) => c.verification === "verified").length;
    step("verify", "done", `${verified} of ${withEmail.length} addresses verified${flags.emailVerifier ? "" : " from official sources"}`);
    await store.saveScan(scan);

    step("emails", "start");
    const emails: EmailDraft[] = [];
    await mapLimit(finalMatches, EMAIL_CONCURRENCY, async (m) => {
      const coach = primaryContact(m.coaches);
      if (!coach) return;
      const { draft, usd: u } = await composeEmail({ athlete, prefs: scan.preferences, match: m, coach });
      usd += u;
      emails.push(draft);
      push({ type: "email", email: draft, at: now() });
    });
    const order = new Map(finalMatches.map((m, i) => [m.program.id, i]));
    scan.emails = emails.sort((a, b) => (order.get(a.programId) ?? 0) - (order.get(b.programId) ?? 0));
    step("emails", "done", `${emails.length} personalized emails drafted${flags.ai ? "" : " (template writer — AI not configured)"}`);

    scan.status = "complete";
    scan.costUsd = Math.round(usd * 10000) / 10000;
    push({ type: "done", at: now() });
  } catch (e) {
    scan.status = "failed";
    scan.error = (e as Error).message;
    push({ type: "error", message: scan.error, at: now() });
  } finally {
    await store.saveScan(scan);
    if (usd > 0) await store.recordCost({ scanId: scan.id, ownerId: scan.ownerId, kind: "ai", detail: "scan pipeline", usd, at: now() });
  }
  return scan;
}
