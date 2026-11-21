import * as cheerio from "cheerio";
import { SPORTS, sportFromHudlName } from "@/lib/sports";
import type { AthleteProfile, Film, StatLine } from "@/lib/types";

/**
 * Hudl public profile extraction.
 *
 * Public Hudl profile pages (hudl.com/profile/{id}) are allowed by Hudl's robots.txt and
 * server-render a JSON model of the public profile. We read only that public model —
 * no login, no recruiter-only data, no private API calls. If an athlete's profile is
 * private (common for minors without parental consent), we get nothing and ask the
 * athlete for the essentials instead.
 */

const HUDL_HOSTS = /(^|\.)hudl\.com$/i;

export function parseHudlUrl(input: string): { profileId: string; canonicalUrl: string } | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : "https://" + input.trim());
  } catch {
    return null;
  }
  if (!HUDL_HOSTS.test(url.hostname)) return null;
  const m =
    url.pathname.match(/^\/profile\/(\d{3,12})(?:\/|$)/i) ??
    url.pathname.match(/^\/video\/\d+\/(\d{3,12})(?:\/|$)/i);
  if (!m) return null;
  return { profileId: m[1], canonicalUrl: `https://www.hudl.com/profile/${m[1]}` };
}

/** Extract the first balanced JSON object starting at `start` (string-aware). */
export function sliceJsonObject(src: string, start: number): string | null {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

// Loose shape of the public model — every field optional because Hudl changes it.
interface HudlModel {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    primaryName?: string | null;
    positions?: string | null;
    graduationYear?: number | null;
    jersey?: string | null;
    canonicalUrl?: string | null;
    mostRelevantTeam?: {
      schoolName?: string | null;
      schoolLocation?: string | null;
      stateAbbreviation?: string | null;
      sportName?: string | null;
    } | null;
    teams?: Array<{ name?: string; sportName?: string; location?: string; endYear?: number }> | null;
  } | null;
  about?: {
    overview?: {
      organization?: string | null;
      location?: string | null;
      graduationYear?: number | null;
      height?: string | null;
      weight?: number | string | null;
      heightWeightVerified?: boolean;
      twitter?: string | null;
      teams?: Array<{ positions?: string[]; sportName?: string; jerseyNumber?: number | null; organizationName?: string }>;
    } | null;
    strengthAndSpeed?: Record<string, unknown> | null;
    academic?: Record<string, unknown> | null;
  } | null;
  highlights?: {
    reels?: Array<{
      title?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      season?: number;
      durationMs?: number;
      isDraft?: boolean;
    }>;
  } | null;
  athleteCommitment?: unknown;
  contactInfo?: Record<string, unknown> | null;
}

export function extractHudlModel(html: string): HudlModel | null {
  const marker = "window.__hudlEmbed=";
  let idx = html.indexOf(marker);
  while (idx >= 0) {
    const start = html.indexOf("{", idx + marker.length);
    const raw = start >= 0 ? sliceJsonObject(html, start) : null;
    if (raw) {
      try {
        const root = JSON.parse(raw) as { model?: HudlModel; data?: { model?: HudlModel } };
        const model = root.model ?? root.data?.model;
        if (model && (model.user || model.about)) return model;
      } catch {
        /* try next marker */
      }
    }
    idx = html.indexOf(marker, idx + marker.length);
  }
  return null;
}

/** "6'1\"", "6-1", "6' 1''", "73", "6 ft 1 in" → inches. */
export function parseHeight(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const ftIn = s.match(/^(\d)\s*(?:'|’|ft|-|\s)\s*(\d{1,2})?\s*(?:"|''|”|in)?$/i);
  if (ftIn) {
    const inches = Number(ftIn[1]) * 12 + Number(ftIn[2] ?? 0);
    return inches >= 48 && inches <= 96 ? inches : undefined;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n >= 48 && n <= 96) return Math.round(n);
  return undefined;
}

export function parseWeight(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 80 && n <= 450 ? Math.round(n) : undefined;
}

const MEASURABLE_LABELS: Record<string, string> = {
  forty: "40-yard dash",
  shuttle: "Shuttle",
  proAgility: "Pro agility",
  vertical: "Vertical jump",
  bench: "Bench press",
  benchPressReps: "Bench reps (185)",
  squat: "Squat",
  clean: "Power clean",
  deadLift: "Deadlift",
  powerball: "Powerball toss",
  meter100: "100m",
  meter400: "400m",
  meter1600: "1600m",
  meter3200: "3200m",
  standingReach: "Standing reach",
};

function cityState(location: string | null | undefined): { city?: string; state?: string } {
  if (!location) return {};
  const m = location.match(/^\s*(.+?),\s*([A-Z]{2})\s*$/);
  return m ? { city: m[1], state: m[2] } : {};
}

export interface HudlExtraction {
  profile: Partial<AthleteProfile>;
  /** True when Hudl returned an empty/private shell. */
  restricted: boolean;
  notes: string[];
}

export function mapHudlModel(model: HudlModel, canonicalUrl: string, profileId: string): HudlExtraction {
  const notes: string[] = [];
  const user = model.user ?? {};
  const overview = model.about?.overview ?? {};
  const team = user.mostRelevantTeam ?? {};
  const sport = sportFromHudlName(team.sportName ?? overview.teams?.[0]?.sportName ?? user.teams?.[0]?.sportName);
  const prov: Record<string, "hudl"> = {};
  const p: Partial<AthleteProfile> = { sourceUrl: canonicalUrl, sourceKind: "hudl", sourceId: profileId };

  const set = <K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K] | undefined | null) => {
    if (v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0)) return;
    p[k] = v as AthleteProfile[K];
    prov[k as string] = "hudl";
  };

  const first = user.firstName ?? user.primaryName?.split(" ")[0];
  const last = user.lastName ?? user.primaryName?.split(" ").slice(1).join(" ");
  set("firstName", first?.trim());
  set("lastName", last?.trim());
  if (sport) set("sport", sport);

  // Positions: prefer the team entry for this sport, else the user summary.
  const sportTeam = overview.teams?.find((t) => sportFromHudlName(t.sportName) === sport) ?? overview.teams?.[0];
  const rawPositions = [...(sportTeam?.positions ?? []), ...(user.positions ? user.positions.split(/[\/,]/) : [])]
    .map((x) => x.trim())
    .filter(Boolean);
  const cfg = sport ? SPORTS[sport] : undefined;
  const normalized = [...new Set(rawPositions.map((r) => (cfg?.positionGroups(r)[0] ? r.toUpperCase() : r)))];
  set("positions", normalized);

  set("gradYear", overview.graduationYear ?? user.graduationYear ?? undefined);
  set("highSchool", overview.organization ?? team.schoolName ?? undefined);
  const loc = cityState(overview.location ?? team.schoolLocation);
  set("city", loc.city);
  set("state", loc.state ?? team.stateAbbreviation ?? undefined);
  set("heightIn", parseHeight(overview.height));
  set("weightLb", parseWeight(overview.weight));
  set("jersey", user.jersey ?? (sportTeam?.jerseyNumber != null ? String(sportTeam.jerseyNumber) : undefined));
  set("twitter", overview.twitter ?? undefined);
  if (overview.heightWeightVerified) notes.push("Height and weight are marked verified on Hudl.");

  const measurables: StatLine[] = [];
  const ss = model.about?.strengthAndSpeed ?? {};
  for (const [key, label] of Object.entries(MEASURABLE_LABELS)) {
    const v = ss[key];
    if (v === null || v === undefined || v === "" || v === 0) continue;
    measurables.push({ label, value: String(v), verified: Boolean(ss[`${key}Verified`]), source: "hudl" });
  }
  set("measurables", measurables);

  const ach = ss.achievements;
  if (typeof ach === "string" && ach.trim()) set("achievements", ach.split(/\r?\n|;|•/).map((a) => a.trim()).filter(Boolean));
  else if (Array.isArray(ach)) set("achievements", ach.map(String).filter(Boolean));

  const academic = model.about?.academic;
  if (academic && typeof academic === "object") {
    const gpa = Number((academic as Record<string, unknown>).gpa ?? (academic as Record<string, unknown>).cumulativeGpa);
    if (Number.isFinite(gpa) && gpa > 0 && gpa <= 5) set("gpa", gpa);
    const sat = (academic as Record<string, unknown>).sat;
    const act = (academic as Record<string, unknown>).act;
    const scores = [sat ? `SAT ${sat}` : "", act ? `ACT ${act}` : ""].filter(Boolean).join(", ");
    set("testScores", scores || undefined);
    const major = (academic as Record<string, unknown>).intendedMajor ?? (academic as Record<string, unknown>).major;
    if (typeof major === "string") set("intendedMajor", major);
  }

  const film: Film[] = [];
  for (const r of model.highlights?.reels ?? []) {
    if (r.isDraft || !r.videoUrl) continue;
    film.push({
      title: r.title?.trim() || "Highlight",
      url: new URL(r.videoUrl, "https://www.hudl.com").toString(),
      thumbnailUrl: r.thumbnailUrl,
      season: r.season,
      durationSec: r.durationMs ? Math.round(r.durationMs / 1000) : undefined,
    });
  }
  set("film", film);

  const commit = model.athleteCommitment as { schoolName?: string; organizationName?: string } | null | undefined;
  if (commit && typeof commit === "object") set("commitment", commit.schoolName ?? commit.organizationName);

  p.provenance = prov;
  const restricted = !p.firstName && !p.gradYear && !p.highSchool;
  if (restricted) notes.push("This Hudl profile is private or empty to the public, so nothing could be read from it.");
  if (!film.length) notes.push("No public highlight reels were found on this profile.");
  return { profile: p, restricted, notes };
}

/** Fallback when the embedded model is missing: Open Graph tags are still public. */
export function extractFromOpenGraph(html: string): Partial<AthleteProfile> {
  const $ = cheerio.load(html);
  const title = $('meta[property="og:title"]').attr("content") ?? "";
  const desc = $('meta[property="og:description"]').attr("content") ?? "";
  const name = title.replace(/\s+on Hudl\s*$/i, "").trim();
  const out: Partial<AthleteProfile> = { provenance: {} };
  if (name) {
    const [first, ...rest] = name.split(/\s+/);
    out.firstName = first;
    out.lastName = rest.join(" ");
    out.provenance!.firstName = "hudl";
  }
  const info = desc.match(/More info:\s*(.+?)\s*\/\s*(.+?),\s*([A-Z]{2})/);
  if (info) {
    out.highSchool = info[1].replace(/\s+-\s+.*$/, "");
    out.city = info[2];
    out.state = info[3];
    Object.assign(out.provenance!, { highSchool: "hudl", city: "hudl", state: "hudl" });
  }
  return out;
}
