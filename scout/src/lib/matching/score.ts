import { academicSignal } from "@/lib/colleges/programs";
import { milesBetweenStates, regionOf, REGIONS } from "@/lib/colleges/geo";
import { fmtHeight, groupSize } from "@/lib/roster/outlook";
import type { AthleteProfile, Division, MatchReason, Preferences, Program, RosterOutlook, RosterSnapshot } from "@/lib/types";
import { DIVISION_LABEL } from "@/lib/types";

/**
 * Explainable, deterministic matching. Every point a program earns is attached to a
 * human-readable reason built from real data (preferences, distances, the program's
 * own published roster). No model call, no hidden probabilities.
 *
 * Stage 1 (`prefilter`) ranks the whole catalogue from cheap signals.
 * Stage 2 (`finalScore`) adds roster evidence once a program has been researched.
 */

export interface Candidate {
  program: Program;
  base: number;
  reasons: MatchReason[];
  distanceMiles?: number;
}

const ALL_DIVISIONS: Division[] = ["FBS", "FCS", "D2", "D3", "NAIA", "NJCAA", "CCCAA"];

export function allowedStates(prefs: Preferences): Set<string> | null {
  const s = new Set(prefs.states);
  for (const r of prefs.regions) (REGIONS[r] ?? []).forEach((x) => s.add(x));
  return s.size ? s : null;
}

export function prefilter(programs: Program[], athlete: AthleteProfile, prefs: Preferences): Candidate[] {
  const divisions = prefs.divisions.length ? new Set(prefs.divisions) : new Set(ALL_DIVISIONS);
  const states = allowedStates(prefs);
  const home = athlete.state;
  const out: Candidate[] = [];

  for (const program of programs) {
    if (!divisions.has(program.division)) continue;
    if (states && !states.has(program.state)) continue;
    const distanceMiles = home ? milesBetweenStates(home, program.state) : undefined;
    if (prefs.maxDistanceMiles && distanceMiles !== undefined && distanceMiles > prefs.maxDistanceMiles) continue;

    const reasons: MatchReason[] = [];
    let base = 0;

    if (prefs.divisions.length) {
      base += 10;
      reasons.push({ kind: "division", text: `${DIVISION_LABEL[program.division]} is one of the levels you chose.`, weight: 10 });
    }

    if (states) {
      base += 12;
      reasons.push({ kind: "geography", text: `In ${program.state}, inside the area you asked for.`, weight: 12 });
    } else if (distanceMiles !== undefined) {
      const w = distanceMiles === 0 ? 22 : distanceMiles <= 250 ? 18 : distanceMiles <= 500 ? 12 : distanceMiles <= 900 ? 6 : 0;
      base += w;
      if (distanceMiles === 0) reasons.push({ kind: "geography", text: `In your home state of ${program.state}.`, weight: w });
      else if (w > 0) reasons.push({ kind: "geography", text: `About ${distanceMiles} miles from home${regionOf(program.state) && regionOf(program.state) === regionOf(home!) ? `, in the ${regionOf(program.state)}` : ""}.`, weight: w });
    }

    const academic = academicSignal(program);
    if (prefs.academicPriority !== "any") {
      if (academic === "top") {
        base += prefs.academicPriority === "top" ? 25 : 18;
        reasons.push({ kind: "academics", text: `${program.conference === "Ivy League" || program.conference === "NESCAC" ? `${program.conference} school` : "Highly selective school"} — matches your academic priority.`, weight: 20 });
      } else if (academic === "strong") {
        base += prefs.academicPriority === "top" ? 10 : 15;
        reasons.push({ kind: "academics", text: "Strong academic reputation — matches your academic priority.", weight: 15 });
      } else if (prefs.academicPriority === "top") {
        continue;
      }
    }

    out.push({ program, base, reasons, distanceMiles });
  }
  return out.sort((a, b) => b.base - a.base || (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));
}

/** Pick a research pool that already respects the diversity caps used for the final list. */
export function researchPool(cands: Candidate[], prefs: Preferences, size: number): Candidate[] {
  return diversify(cands, prefs, size, (c) => c.base);
}

export function finalScore(
  c: Candidate,
  athlete: AthleteProfile,
  group: string | undefined,
  outlook: RosterOutlook | undefined,
  snapshot: RosterSnapshot | null,
  groupPlural: string,
): { score: number; reasons: MatchReason[] } {
  const reasons = [...c.reasons];
  let score = c.base;

  if (outlook) {
    const w = { strong: 30, moderate: 16, low: 0, unknown: 4 }[outlook.signal];
    score += w;
    if (outlook.signal === "strong" || outlook.signal === "moderate")
      reasons.push({ kind: "roster", text: outlook.explanation, weight: w });
  } else {
    score += 4;
  }

  if (snapshot && group && athlete.heightIn) {
    const size = groupSize(snapshot, group);
    if (size.height) {
      const h = athlete.heightIn;
      if (h >= size.height.p10 && h <= size.height.p90) {
        score += 6;
        reasons.push({
          kind: "measurables",
          text: `Your listed ${fmtHeight(h)} fits the current ${groupPlural} room (${fmtHeight(size.height.p10)}–${fmtHeight(size.height.p90)}).`,
          weight: 6,
        });
      } else if (h < size.height.p10) {
        score -= 8;
      }
    }
  }

  return { score, reasons: reasons.sort((a, b) => b.weight - a.weight) };
}

export function diversify<T extends { program: Program }>(items: T[], prefs: Preferences, n: number, scoreOf: (t: T) => number): T[] {
  const perDivision = prefs.divisions.length === 1 ? n : prefs.divisions.length ? Math.ceil((n / prefs.divisions.length) * 1.5) : Math.ceil(n / 4);
  const perConference = 4;
  const sorted = [...items].sort((a, b) => scoreOf(b) - scoreOf(a));
  const picked: T[] = [];
  const divCount = new Map<string, number>();
  const confCount = new Map<string, number>();
  for (const it of sorted) {
    if (picked.length >= n) break;
    const d = it.program.division;
    const conf = `${d}|${it.program.conference ?? it.program.id}`;
    if ((divCount.get(d) ?? 0) >= perDivision) continue;
    if ((confCount.get(conf) ?? 0) >= perConference) continue;
    picked.push(it);
    divCount.set(d, (divCount.get(d) ?? 0) + 1);
    confCount.set(conf, (confCount.get(conf) ?? 0) + 1);
  }
  // If caps left the list short (narrow preferences), fill with the best remaining.
  for (const it of sorted) {
    if (picked.length >= n) break;
    if (!picked.includes(it)) picked.push(it);
  }
  return picked;
}
