import type { Coach } from "@/lib/types";

/**
 * Football knowledge used by the deterministic parts of the engine:
 * position normalisation, roster grouping and coach-title interpretation.
 * Other sports implement the same `SportConfig` shape (see ./index.ts).
 */

export const FOOTBALL_GROUPS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ST", "ATH"] as const;
export type FootballGroup = (typeof FOOTBALL_GROUPS)[number];

export const GROUP_LABEL: Record<FootballGroup, { singular: string; plural: string }> = {
  QB: { singular: "quarterback", plural: "quarterbacks" },
  RB: { singular: "running back", plural: "running backs" },
  WR: { singular: "wide receiver", plural: "wide receivers" },
  TE: { singular: "tight end", plural: "tight ends" },
  OL: { singular: "offensive lineman", plural: "offensive linemen" },
  DL: { singular: "defensive lineman", plural: "defensive linemen" },
  LB: { singular: "linebacker", plural: "linebackers" },
  DB: { singular: "defensive back", plural: "defensive backs" },
  ST: { singular: "specialist", plural: "specialists" },
  ATH: { singular: "athlete", plural: "athletes" },
};

const POSITION_ALIASES: Record<string, FootballGroup> = {
  QB: "QB",
  RB: "RB", HB: "RB", TB: "RB", FB: "RB",
  WR: "WR", SLOT: "WR", WO: "WR", SB: "WR", X: "WR", Z: "WR",
  TE: "TE", "H-BACK": "TE", HBACK: "TE", Y: "TE",
  OL: "OL", OT: "OL", OG: "OL", T: "OL", G: "OL", C: "OL", LT: "OL", RT: "OL", LG: "OL", RG: "OL", OC: "OL",
  DL: "DL", DE: "DL", DT: "DL", NT: "DL", NG: "DL", EDGE: "DL", DI: "DL",
  LB: "LB", ILB: "LB", OLB: "LB", MLB: "LB", ROV: "LB", WLB: "LB", SLB: "LB", "STAR": "LB",
  DB: "DB", CB: "DB", S: "DB", FS: "DB", SS: "DB", SAF: "DB", NB: "DB", NICKEL: "DB",
  K: "ST", P: "ST", LS: "ST", PK: "ST", "K/P": "ST", SN: "ST",
  ATH: "ATH",
};

const WORD_ALIASES: Array<[RegExp, FootballGroup]> = [
  [/quarterback/i, "QB"],
  [/running ?back|halfback|tailback|fullback/i, "RB"],
  [/wide ?receiver|receiver|slot/i, "WR"],
  [/tight ?end/i, "TE"],
  [/offensive (line|tackle|guard)|center/i, "OL"],
  [/defensive (line|end|tackle)|nose|edge/i, "DL"],
  [/linebacker/i, "LB"],
  [/corner|safety|defensive back|secondary/i, "DB"],
  [/kicker|punter|long ?snap/i, "ST"],
  [/athlete/i, "ATH"],
];

/** "OLB/DE" → ["LB","DL"]; "Wide Receiver" → ["WR"]. Unknown tokens are dropped, never guessed. */
export function positionGroups(raw: string | null | undefined): FootballGroup[] {
  if (!raw) return [];
  const out = new Set<FootballGroup>();
  for (const tok of raw.split(/[\/,|&;]+|\s+-\s+|\s+and\s+/i)) {
    const t = tok.trim().toUpperCase().replace(/\./g, "");
    if (!t) continue;
    if (POSITION_ALIASES[t]) {
      out.add(POSITION_ALIASES[t]);
      continue;
    }
    for (const [re, g] of WORD_ALIASES) if (re.test(tok)) { out.add(g); break; }
  }
  return [...out];
}

export function primaryGroup(positions: string[]): FootballGroup | undefined {
  for (const p of positions) {
    const g = positionGroups(p)[0];
    if (g) return g;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Coach titles                                                        */
/* ------------------------------------------------------------------ */

const TITLE_GROUPS: Array<[RegExp, FootballGroup[]]> = [
  [/quarterbacks?\b/i, ["QB"]],
  [/running ?backs?|\bRBs?\b/i, ["RB"]],
  [/wide ?receivers?|\breceivers\b|\bWRs?\b/i, ["WR"]],
  [/tight ?ends?|\bTEs?\b/i, ["TE"]],
  [/offensive ?line|\bOL\b|offensive tackles|interior offensive/i, ["OL"]],
  [/defensive ?line|defensive ends?|defensive tackles?|\bDL\b|edge|outside rush|pass rush/i, ["DL"]],
  [/linebackers?|\bLBs?\b/i, ["LB"]],
  [/secondary|defensive ?backs?|cornerbacks?|corners|safeties|nickels?|\bDBs?\b|\bCBs?\b/i, ["DB"]],
  [/special ?teams|kickers?|specialists?/i, ["ST"]],
];

const EXCLUDED_TITLE =
  /strength|conditioning|athletic train|video|equipment|nutrition|sports? (medicine|perform)|mental|chaplain|academic|compliance|admin(istrative)? (assistant|associate)|creative|graphic|social media|communications|marketing|ticket|business|intern\b|student (assistant|manager)|manager|scout team|analyst|quality control|director of (football )?operations|operations/i;

export function classifyCoachTitle(title: string): { role: Coach["role"]; groups: FootballGroup[]; excluded: boolean } {
  const t = title.trim();
  const groups = new Set<FootballGroup>();
  for (const [re, gs] of TITLE_GROUPS) if (re.test(t)) gs.forEach((g) => groups.add(g));

  const isHead = /^head (football )?coach\b|\bhead coach\b/i.test(t) && !/assistant|associate head/i.test(t);
  const isRecruiting = /recruit|player personnel|personnel director/i.test(t);
  const isOC = /offensive coordinator|co-offensive coordinator|\bOC\b/i.test(t);
  const isDC = /defensive coordinator|co-defensive coordinator|\bDC\b/i.test(t);
  const isSTC = /special teams coordinator/i.test(t);

  if (isOC) ["QB", "RB", "WR", "TE", "OL"].forEach((g) => groups.add(g as FootballGroup));
  if (isDC) ["DL", "LB", "DB"].forEach((g) => groups.add(g as FootballGroup));
  if (isSTC) groups.add("ST");

  // Recruiting staff are relevant even when their title also says "operations".
  const excluded = !isHead && !isRecruiting && groups.size === 0 && EXCLUDED_TITLE.test(t);
  // Titles like "Analyst - Wide Receivers" are support staff even with a group in them.
  const supportOnly = /analyst|quality control|graduate assistant|\bGA\b|intern/i.test(t) && !isRecruiting;

  let role: Coach["role"] = "other";
  if (isHead) role = "head";
  else if (isRecruiting) role = "recruiting";
  else if (isOC || isDC || isSTC) role = "coordinator";
  else if (groups.size > 0 && !supportOnly) role = "position";
  else if (/assistant coach|associate head coach|coach/i.test(t) && !supportOnly) role = "assistant";

  return { role, groups: [...groups], excluded: excluded || (supportOnly && role === "other") };
}

/**
 * How useful a coach is as a first contact for an athlete at `group`.
 * Position coach > recruiting coordinator > coordinator for that side > head coach > other assistants.
 * Small staffs (D3/NAIA/JUCO) often have the head coach doing the recruiting, so the
 * head coach is always kept as a fallback contact.
 */
export function coachRelevance(coach: Pick<Coach, "role" | "positionGroups">, group: FootballGroup | undefined): number {
  const covers = group ? coach.positionGroups.includes(group) : false;
  switch (coach.role) {
    case "position":
      return covers ? 100 : 20;
    case "recruiting":
      return covers ? 95 : 80;
    case "coordinator":
      return covers ? 70 : 15;
    case "head":
      return 60;
    case "assistant":
      return covers ? 65 : 25;
    default:
      return 0;
  }
}
