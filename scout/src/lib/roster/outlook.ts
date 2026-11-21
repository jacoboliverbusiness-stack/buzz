import type { RosterOutlook, RosterPlayer, RosterSnapshot } from "@/lib/types";

/**
 * Projected roster opportunity at a position group, computed only from the program's
 * published roster. This is a projection from listed class years — it does not know
 * about redshirts, extra eligibility years, transfers, or the program's recruiting
 * board, and the UI and emails never present it as a confirmed need.
 */

/** Seasons of eligibility left after the roster's current season (conservative). */
const YEARS_LEFT: Record<RosterPlayer["classYear"], number | null> = {
  FR: 3, "RS-FR": 3, SO: 2, "RS-SO": 2, JR: 1, "RS-JR": 1, SR: 0, "RS-SR": 0, GR: 0, UNK: null,
};

export function rosterOutlook(
  snapshot: RosterSnapshot,
  group: string,
  athleteGradYear: number,
  groupLabelPlural: string,
): RosterOutlook {
  const players = snapshot.players.filter((p) => p.positionGroup === group);
  const known = players.filter((p) => YEARS_LEFT[p.classYear] !== null);
  // An athlete graduating high school in spring G arrives for the fall G season.
  const seasonsUntilArrival = Math.max(1, athleteGradYear - snapshot.season);
  const departing = known.filter((p) => (YEARS_LEFT[p.classYear] as number) < seasonsUntilArrival).length;
  const remaining = players.length - departing;

  if (players.length === 0 || known.length < Math.max(3, players.length * 0.6)) {
    return {
      positionGroup: group,
      onRoster: players.length,
      departingBeforeArrival: departing,
      remainingAtArrival: remaining,
      signal: "unknown",
      explanation:
        players.length === 0
          ? `No ${groupLabelPlural} could be identified on the ${snapshot.season} roster.`
          : `The ${snapshot.season} roster doesn't list class years for enough ${groupLabelPlural} to project openings.`,
      sourceUrl: snapshot.sourceUrl,
    };
  }

  const share = departing / players.length;
  const signal: RosterOutlook["signal"] = share >= 0.35 && departing >= 2 ? "strong" : share >= 0.2 && departing >= 1 ? "moderate" : "low";
  const arrival = `fall ${athleteGradYear}`;
  const explanation =
    departing === 0
      ? `None of the ${players.length} ${groupLabelPlural} on the ${snapshot.season} roster are listed in classes expected to leave before ${arrival}.`
      : `${departing} of ${players.length} ${groupLabelPlural} on the ${snapshot.season} roster are listed in classes expected to use up eligibility before ${arrival}.`;

  return {
    positionGroup: group,
    onRoster: players.length,
    departingBeforeArrival: departing,
    remainingAtArrival: remaining,
    signal,
    explanation,
    sourceUrl: snapshot.sourceUrl,
  };
}

/** Height/weight range of the current position group, for grounded size comparisons. */
export function groupSize(snapshot: RosterSnapshot, group: string) {
  const ps = snapshot.players.filter((p) => p.positionGroup === group);
  const hs = ps.map((p) => p.heightIn).filter((x): x is number => !!x).sort((a, b) => a - b);
  const ws = ps.map((p) => p.weightLb).filter((x): x is number => !!x).sort((a, b) => a - b);
  const pct = (arr: number[], q: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(q * (arr.length - 1))))];
  return {
    count: ps.length,
    height: hs.length >= 4 ? { p10: pct(hs, 0.1), median: pct(hs, 0.5), p90: pct(hs, 0.9) } : undefined,
    weight: ws.length >= 4 ? { p10: pct(ws, 0.1), median: pct(ws, 0.5), p90: pct(ws, 0.9) } : undefined,
  };
}

export function fmtHeight(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}
