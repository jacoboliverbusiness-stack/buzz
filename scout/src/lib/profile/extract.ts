import "server-only";
import { fetchPage, FetchBlockedError } from "@/lib/http/fetcher";
import { SPORTS } from "@/lib/sports";
import type { AthleteProfile, FactSource } from "@/lib/types";
import { extractFromOpenGraph, extractHudlModel, mapHudlModel, parseHudlUrl } from "./sources/hudl";

/**
 * Profile source registry. Hudl is live for the MVP; the others are declared so
 * URL detection, provenance and the UI already handle them, and each gets an
 * extractor once a permitted access path (public page or partner API) is confirmed.
 */
interface SourceDef {
  kind: FactSource;
  label: string;
  match: (url: URL) => boolean;
  live: boolean;
}

export const PROFILE_SOURCES: SourceDef[] = [
  { kind: "hudl", label: "Hudl", match: (u) => /(^|\.)hudl\.com$/i.test(u.hostname), live: true },
  { kind: "maxpreps", label: "MaxPreps", match: (u) => /(^|\.)maxpreps\.com$/i.test(u.hostname), live: false },
  { kind: "sportsrecruits", label: "SportsRecruits", match: (u) => /(^|\.)sportsrecruits\.com$/i.test(u.hostname), live: false },
  { kind: "ncsa", label: "NCSA", match: (u) => /(^|\.)ncsasports\.org$/i.test(u.hostname), live: false },
];

export type ExtractResult =
  | { ok: true; profile: Partial<AthleteProfile>; missing: string[]; notes: string[] }
  | { ok: false; code: "invalid_url" | "unsupported_source" | "unreachable" | "private"; message: string };

/** Fields we must have before matching. Everything else is optional. */
export function missingEssentials(p: Partial<AthleteProfile>): string[] {
  const missing: string[] = [];
  if (!p.firstName) missing.push("firstName");
  if (!p.lastName) missing.push("lastName");
  if (!p.sport) missing.push("sport");
  if (!p.positions?.length) missing.push("positions");
  if (!p.gradYear) missing.push("gradYear");
  if (!p.state) missing.push("state");
  if (!p.highSchool) missing.push("highSchool");
  return missing;
}

export async function extractProfile(input: string): Promise<ExtractResult> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : "https://" + input.trim());
  } catch {
    return { ok: false, code: "invalid_url", message: "That doesn't look like a link. Paste the full address of your Hudl profile." };
  }
  const source = PROFILE_SOURCES.find((s) => s.match(url));
  if (!source) return { ok: false, code: "unsupported_source", message: "Paste a Hudl profile link, like hudl.com/profile/12345678/your-name." };
  if (!source.live)
    return {
      ok: false,
      code: "unsupported_source",
      message: `${source.label} profiles are coming soon. For now, paste your Hudl link or enter your details manually.`,
    };

  const parsed = parseHudlUrl(url.toString());
  if (!parsed) return { ok: false, code: "invalid_url", message: "Use your Hudl profile link — it looks like hudl.com/profile/12345678/your-name." };

  let html: string;
  try {
    html = (await fetchPage(parsed.canonicalUrl)).body;
  } catch (e) {
    const reason = e instanceof FetchBlockedError ? e.reason : "network";
    return {
      ok: false,
      code: reason === "login" ? "private" : "unreachable",
      message: reason === "login" ? "That Hudl profile isn't public." : "We couldn't reach Hudl right now. Try again in a moment, or enter your details manually.",
    };
  }

  const model = extractHudlModel(html);
  const result = model
    ? mapHudlModel(model, parsed.canonicalUrl, parsed.profileId)
    : { profile: { sourceUrl: parsed.canonicalUrl, sourceKind: "hudl" as const, sourceId: parsed.profileId, ...extractFromOpenGraph(html) }, restricted: false, notes: ["Hudl returned a limited page; only basic details were available."] };

  const notes = [...result.notes];
  if (result.profile.sport && !SPORTS[result.profile.sport].enabled) {
    notes.push(`${SPORTS[result.profile.sport].label} matching is coming soon — Scout currently builds football campaigns.`);
  }
  return { ok: true, profile: result.profile, missing: missingEssentials(result.profile), notes };
}
