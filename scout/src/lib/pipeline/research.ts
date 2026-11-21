import "server-only";
import crypto from "node:crypto";
import { aiExtractRoster, aiExtractStaff } from "@/lib/ai/extract";
import { parseStaffHtml, type RawStaff } from "@/lib/coaches/parse";
import { detectPattern, inferEmail } from "@/lib/coaches/infer";
import { integrations } from "@/lib/env";
import { fetchPage, FetchBlockedError } from "@/lib/http/fetcher";
import { parseHeight, parseWeight } from "@/lib/profile/sources/hudl";
import { normalizeClass, parseRosterHtml } from "@/lib/roster/parse";
import { classifyCoachTitle } from "@/lib/sports/football";
import { SPORTS } from "@/lib/sports";
import { getStore } from "@/lib/store";
import type { Coach, Program, RosterSnapshot } from "@/lib/types";
import { verifyEmail } from "@/lib/verify/email";

/**
 * Program research: roster + coaching staff from the program's official site.
 * Results are cached in the shared store and reused for every athlete until stale,
 * so most scans touch the network for only a few programs.
 */

export const ROSTER_TTL_MS = 1000 * 60 * 60 * 24 * 14; // two weeks
export const COACH_TTL_MS = 1000 * 60 * 60 * 24 * 7; // weekly — staff turnover matters for deliverability

export interface ResearchOutcome {
  snapshot: RosterSnapshot | null;
  coaches: Coach[];
  usd: number;
  notes: string[];
  cached: { roster: boolean; coaches: boolean };
}

function currentSeason(now = new Date()): number {
  // Rosters for the fall season are published in late spring/summer.
  return now.getUTCMonth() >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

const stale = (iso: string | undefined, ttl: number) => !iso || Date.now() - Date.parse(iso) > ttl;

async function tryFetch(urls: string[]): Promise<{ url: string; html: string } | null> {
  for (const url of urls) {
    try {
      const page = await fetchPage(url);
      if (page.body.length > 500) return { url: page.finalUrl, html: page.body };
    } catch (e) {
      if (e instanceof FetchBlockedError && e.reason === "robots") continue;
    }
  }
  return null;
}

export async function researchProgram(program: Program): Promise<ResearchOutcome> {
  const store = getStore();
  const notes: string[] = [];
  let usd = 0;
  const sport = SPORTS[program.sport];
  const base = program.athleticsUrl.replace(/\/$/, "");
  const rosterUrls = program.rosterPath ? [base + program.rosterPath] : sport.sitePaths.map((p) => `${base}/sports/${p}/roster`);
  const staffUrls = program.staffPath ? [base + program.staffPath] : [...sport.sitePaths.map((p) => `${base}/sports/${p}/coaches`), `${base}/staff-directory`];

  /* ---------------- roster ---------------- */
  let snapshot = await store.getRoster(program.id);
  const rosterCached = !!snapshot && !stale(snapshot.fetchedAt, ROSTER_TTL_MS);
  let rosterHtml: { url: string; html: string } | null = null;

  if (!rosterCached) {
    rosterHtml = await tryFetch(rosterUrls);
    if (rosterHtml) {
      let parsed = parseRosterHtml(rosterHtml.html, sport.positionGroups);
      if (parsed.players.length < 25 && integrations().ai) {
        const ai = await aiExtractRoster(rosterHtml.html).catch(() => null);
        if (ai && ai.output.players.length > parsed.players.length) {
          usd += ai.usd;
          parsed = {
            season: ai.output.season ?? parsed.season,
            method: "ai",
            players: ai.output.players.map((p) => ({
              name: p.name,
              position: p.position,
              positionGroup: sport.positionGroups(p.position)[0] ?? "UNK",
              classYear: normalizeClass(p.class_year),
              heightIn: parseHeight(p.height),
              weightLb: parseWeight(p.weight),
            })),
          };
        }
      }
      if (parsed.players.length >= 15) {
        snapshot = {
          programId: program.id,
          season: parsed.season ?? currentSeason(),
          sourceUrl: rosterHtml.url,
          fetchedAt: new Date().toISOString(),
          players: parsed.players,
        };
        await store.saveRoster(snapshot);
      } else {
        notes.push(`Couldn't read a roster from ${program.school}'s site.`);
      }
    } else {
      notes.push(`${program.school}'s roster page wasn't reachable.`);
    }
  }

  /* ---------------- coaches ---------------- */
  const cachedCoaches = await store.getCoaches(program.id);
  if (cachedCoaches && !stale(cachedCoaches.fetchedAt, COACH_TTL_MS)) {
    return { snapshot, coaches: cachedCoaches.coaches, usd, notes, cached: { roster: rosterCached, coaches: true } };
  }

  let staff: RawStaff[] = [];
  let staffSource = "";
  // Sidearm roster pages usually list the coaching staff too — reuse the page we already have.
  if (rosterHtml) {
    staff = parseStaffHtml(rosterHtml.html).filter((s) => classifyCoachTitle(s.title).role !== "other");
    staffSource = rosterHtml.url;
  }
  if (staff.length < 3 || !staff.some((s) => s.email)) {
    const page = await tryFetch(staffUrls);
    if (page) {
      let parsed = parseStaffHtml(page.html, { footballOnly: page.url.includes("staff-directory") });
      if (parsed.length < 3 && integrations().ai) {
        const ai = await aiExtractStaff(page.html).catch(() => null);
        if (ai) {
          usd += ai.usd;
          parsed = ai.output.staff.map((s) => ({ name: s.name, title: s.title, email: s.email ?? undefined, phone: s.phone ?? undefined }));
        }
      }
      if (parsed.length >= staff.length) {
        staff = parsed;
        staffSource = page.url;
      }
    }
  }
  if (!staff.length) {
    notes.push(`Couldn't read ${program.school}'s coaching staff page.`);
    return { snapshot, coaches: cachedCoaches?.coaches ?? [], usd, notes, cached: { roster: rosterCached, coaches: false } };
  }

  const pattern = detectPattern(staff);
  const now = new Date().toISOString();
  const coaches: Coach[] = [];
  for (const s of staff) {
    const cls = classifyCoachTitle(s.title);
    if (cls.excluded || cls.role === "other") continue;
    let email = s.email;
    let inferred = false;
    if (!email && pattern) {
      email = inferEmail(s.name, pattern.pattern, pattern.domain);
      inferred = !!email;
    }
    const v = email ? await verifyEmail(email, { publishedOnOfficialPage: !inferred, inferred }) : null;
    usd += v?.costUsd ?? 0;
    coaches.push({
      id: crypto.createHash("sha1").update(`${program.id}|${s.name.toLowerCase()}`).digest("hex").slice(0, 16),
      programId: program.id,
      name: s.name,
      title: s.title,
      role: cls.role,
      positionGroups: cls.groups,
      email: v && v.status !== "invalid" ? email : undefined,
      phone: s.phone,
      verification: v?.status ?? "unknown",
      verificationDetail: v?.detail ?? "No email address is published for this coach",
      sourceUrl: staffSource,
      lastVerifiedAt: now,
      demo: false,
    });
  }
  await store.saveCoaches(program.id, coaches, now);
  return { snapshot, coaches, usd, notes, cached: { roster: rosterCached, coaches: false } };
}
